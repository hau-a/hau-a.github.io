"""Dispatcher to handle Google Cloud Storage stub requests."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import with_statement

import re
import threading
import xml.etree.ElementTree as ET

from cloudstorage import cloudstorage_stub
from cloudstorage import common

import six
from six.moves import urllib
import six.moves.http_client
import six.moves.urllib.parse

from google.appengine.api import apiproxy_stub_map

__author__ = 'yey@google.com (Ye Yuan)'

# pylint: disable=g-bad-name

# WARNING: This file is externally viewable by our users.  All comments from
# this file will be stripped.  The docstrings will NOT.  Do not put sensitive
# information in docstrings.  If you must communicate internal information in
# this source file, please place them in comments only.


# List bucket if path is in the format of /bucket_name or /bucket_name/.
BUCKET_ONLY_PATH = re.compile('(/[a-z0-9-_.]+)/?$')
# The gcs stub is not thread safe and must be protected using a lock.
GCS_STUB_LOCK = threading.RLock()


class _FakeUrlFetchResult(object):
  def __init__(self, status, headers, content):
    self.status_code = status
    self.headers = headers
    self.content = content


def dispatch(method, headers, url, payload):
  """Dispatches incoming request and returns response.

  In dev appserver GCS requests are forwarded to this method via the /_ah/gcs
  endpoint. In unittest environment, this method is called instead of urlfetch.
  See https://developers.google.com/storage/docs/xml-api-overview for the
  expected format for the request.

  Args:
    method: A string representing the HTTP request method.
    headers: A dict mapping HTTP header names to values.
    url: A string representing the request URL in the form of
        http://<host>/_ah/gcs/<bucket>/<object>.
    payload: A string containing the payload for the request.

  Returns:
    A _FakeUrlFetchResult containing the HTTP status code, headers, and body of
    the response.

  Raises:
    ValueError: invalid request method.
  """
  method, headers, filename, param_dict = _preprocess(method, headers, url)
  gcs_stub = cloudstorage_stub.CloudStorageStub(
      apiproxy_stub_map.apiproxy.GetStub('blobstore').storage)

  with GCS_STUB_LOCK:
    if method == 'POST':
      return _handle_post(gcs_stub, filename, headers)
    elif method == 'PUT':
      return _handle_put(gcs_stub, filename, param_dict, headers, payload)
    elif method == 'GET':
      return _handle_get(gcs_stub, filename, param_dict, headers)
    elif method == 'HEAD':
      return _handle_head(gcs_stub, filename)
    elif method == 'DELETE':
      return _handle_delete(gcs_stub, filename)
    raise ValueError('Unrecognized request method %r.' % method,
                     six.moves.http_client.METHOD_NOT_ALLOWED)


def _preprocess(method, headers, url):
  """Unify input.

  Example:
    _preprocess('POST', {'Content-Type': 'Foo'},
                'http://localhost:8080/_ah/gcs/b/f?foo=bar')
    -> 'POST', {'content-type': 'Foo'}, '/b/f', {'foo':'bar'}

  Args:
    method: HTTP method used by the request.
    headers: HTTP request headers in a dict.
    url: HTTP request url.

  Returns:
    method: method in all upper case.
    headers: headers with keys in all lower case.
    filename: a google storage filename of form /bucket/filename or
      a bucket path of form /bucket
    param_dict: a dict of query parameters.

  Raises:
    ValueError: invalid path.
  """
  _, _, path, query, _ = six.moves.urllib.parse.urlsplit(url)

  if not path.startswith(common.LOCAL_GCS_ENDPOINT):
    raise ValueError('Invalid GCS path: %s' % path,
                     six.moves.http_client.BAD_REQUEST)

  filename = path[len(common.LOCAL_GCS_ENDPOINT):]

  # Note this is not safe with Python 2.5, however since the stub is not
  # supported in 2.5, this is okay.
  param_dict = six.moves.urllib.parse.parse_qs(query, True)
  for k in param_dict:
    param_dict[k] = urllib.parse.unquote(param_dict[k][0])  # pylint: disable=too-many-function-args

  headers = dict((k.lower(), v) for k, v in six.iteritems(headers))
  return method, headers, urllib.parse.unquote(filename), param_dict  # pylint: disable=too-many-function-args


def _handle_post(gcs_stub, filename, headers):
  """Handle POST that starts object creation."""
  content_type = _ContentType(headers)
  token = gcs_stub.post_start_creation(filename, headers)
  response_headers = {
      'location':
          'https://storage.googleapis.com/%s?%s' %
          (urllib.parse.quote(filename),
           urllib.parse.urlencode({'upload_id': token})),
      'content-type':
          content_type.value,
      'content-length':
          0
  }
  return _FakeUrlFetchResult(six.moves.http_client.CREATED, response_headers,
                             '')


def _handle_put(gcs_stub, filename, param_dict, headers, payload):
  """Handle PUT."""
  if _iscopy(headers):
    return _copy(gcs_stub, filename, headers)

  # Continued object creation.
  token = _get_param('upload_id', param_dict)
  content_range = _ContentRange(headers)

  if _is_query_progress(content_range):
    return _find_progress(gcs_stub, filename, token)

  if not content_range.value:
    raise ValueError('Missing header content-range.',
                     six.moves.http_client.BAD_REQUEST)

  # Return 412 Precondition Failed if x-goog-if-generation-match header is set
  # to 0 (no live object) and an object exists already (See
  # https://developers.google.com/storage/docs/object-versioning).
  if (headers.get('x-goog-if-generation-match', None) == '0' and
      gcs_stub.head_object(filename) is not None):
    return _FakeUrlFetchResult(six.moves.http_client.PRECONDITION_FAILED, {},
                               '')

  # If a resumable upload token has not been supplied, then treat this as a
  # direct PUT of an object into Cloud Storage.
  if not token:
    # Check that the Content-Range header is valid for a direct PUT.
    if content_range.length is None:
      raise ValueError('Content-Range must have a final length.',
                       six.moves.http_client.BAD_REQUEST)
    elif not content_range.no_data and content_range.range[0] != 0:
      raise ValueError('Content-Range must specify complete object.',
                       six.moves.http_client.BAD_REQUEST)
    else:
      # Direct put - lets start the upload process by creating a token.
      token = gcs_stub.post_start_creation(filename, headers)

  try:
    gcs_stub.put_continue_creation(token,
                                   payload,
                                   content_range.range,
                                   content_range.length)
  except ValueError as e:
    return _FakeUrlFetchResult(e.args[1], {}, e.args[0])

  if content_range.length is not None:
    # Response for direct PUT & resumable upload should have 0 Content-Length.
    # See https://developers.google.com/storage/docs/reference-methods#putobject
    response_headers = {
        'content-length': 0,
    }
    response_status = six.moves.http_client.OK
  else:
    response_headers = {}
    response_status = 308

  return _FakeUrlFetchResult(response_status, response_headers, '')


def _is_query_progress(content_range):
  """Empty put to query upload status."""
  return content_range.no_data and content_range.length is None


def _find_progress(gcs_stub, filename, token):
  # Upload already finished.
  if gcs_stub.head_object(filename) is not None:
    return _FakeUrlFetchResult(six.moves.http_client.OK, {}, '')
  last_offset = gcs_stub.put_empty(token)
  if last_offset == -1:
    return _FakeUrlFetchResult(308, {}, '')
  return _FakeUrlFetchResult(308, {'range': 'bytes=0-%s' % last_offset}, '')


def _iscopy(headers):
  copysource = _XGoogCopySource(headers)
  return copysource.value is not None


def _copy(gcs_stub, filename, headers):
  """Copy file.

  Args:
    gcs_stub: an instance of gcs stub.
    filename: dst filename of format /bucket/filename
    headers: a dict of request headers. Must contain _XGoogCopySource header.

  Returns:
    An _FakeUrlFetchResult instance.
  """
  source = _XGoogCopySource(headers).value
  result = _handle_head(gcs_stub, source)
  if result.status_code == six.moves.http_client.NOT_FOUND:
    return result
  directive = headers.pop('x-goog-metadata-directive', 'COPY')
  if directive == 'REPLACE':
    gcs_stub.put_copy(source, filename, headers)
  else:
    gcs_stub.put_copy(source, filename, None)
  return _FakeUrlFetchResult(six.moves.http_client.OK, {}, '')


def _handle_get(gcs_stub, filename, param_dict, headers):
  """Handle GET object and GET bucket."""
  mo = re.match(BUCKET_ONLY_PATH, six.ensure_str(filename))
  if mo is not None:
    # Special case location and storageClass queries. Just hardcode US/STANDARD.
    if 'location' in param_dict:
      builder = ET.TreeBuilder()
      builder.start('LocationConstraint', {})
      builder.data('US')
      builder.end('LocationConstraint')
      root = builder.close()
      body = ET.tostring(root)
      response_headers = {'content-length': len(body),
                          'content-type': 'application/xml'}
      return _FakeUrlFetchResult(six.moves.http_client.OK, response_headers,
                                 body)
    elif 'storageClass' in param_dict:
      builder = ET.TreeBuilder()
      builder.start('StorageClass', {})
      builder.data('STANDARD')
      builder.end('StorageClass')
      root = builder.close()
      body = ET.tostring(root)
      response_headers = {'content-length': len(body),
                          'content-type': 'application/xml'}
      return _FakeUrlFetchResult(six.moves.http_client.OK, response_headers,
                                 body)
    else:
      # Get bucket.
      return _handle_get_bucket(gcs_stub, mo.group(1), param_dict)
  else:
    # Get object.
    result = _handle_head(gcs_stub, filename)
    if result.status_code == six.moves.http_client.NOT_FOUND:
      return result

    # Cloud storage always returns HTTP 206 along with Content-Range header if
    # Range header is specified in request.
    start, end = _Range(headers).value
    st_size = result.headers['x-goog-stored-content-length']
    if end is not None:
      result.status_code = six.moves.http_client.PARTIAL_CONTENT
      end = min(end, st_size - 1)
      result.headers['content-range'] = 'bytes %d-%d/%d' % (start, end, st_size)

    result.content = gcs_stub.get_object(filename, start, end)
    result.headers['content-length'] = len(result.content)
    return result


def _handle_get_bucket(gcs_stub, bucketpath, param_dict):
  """Handle get bucket request."""
  prefix = _get_param('prefix', param_dict, '')
  # pylint: disable=protected-access
  max_keys = _get_param('max-keys', param_dict, common._MAX_GET_BUCKET_RESULT)
  marker = _get_param('marker', param_dict, '')
  delimiter = _get_param('delimiter', param_dict, '')

  stats, last_filename, is_truncated = gcs_stub.get_bucket(
      bucketpath, prefix, marker, max_keys, delimiter)

  builder = ET.TreeBuilder()
  builder.start('ListBucketResult', {'xmlns': common.CS_XML_NS})
  for stat in stats:
    filename = stat.filename[len(bucketpath) + 1:]
    if stat.is_dir:
      builder.start('CommonPrefixes', {})
      builder.start('Prefix', {})
      builder.data(filename)
      builder.end('Prefix')
      builder.end('CommonPrefixes')
    else:
      builder.start('Contents', {})

      builder.start('Key', {})
      builder.data(filename)
      builder.end('Key')

      builder.start('LastModified', {})
      builder.data(common.posix_to_dt_str(stat.st_ctime))
      builder.end('LastModified')

      builder.start('ETag', {})
      builder.data(str(stat.etag))
      builder.end('ETag')

      builder.start('Size', {})
      builder.data(str(stat.st_size))
      builder.end('Size')

      builder.end('Contents')

  if last_filename:
    builder.start('NextMarker', {})
    builder.data(last_filename[len(bucketpath) + 1:])
    builder.end('NextMarker')

  builder.start('IsTruncated', {})
  builder.data(str(is_truncated))
  builder.end('IsTruncated')

  max_keys = _get_param('max-keys', param_dict)
  if max_keys is not None:
    builder.start('MaxKeys', {})
    builder.data(str(max_keys))
    builder.end('MaxKeys')

  builder.end('ListBucketResult')
  root = builder.close()

  body = ET.tostring(root)
  response_headers = {'content-length': len(body),
                      'content-type': 'application/xml'}
  return _FakeUrlFetchResult(six.moves.http_client.OK, response_headers, body)


def _handle_head(gcs_stub, filename):
  """Handle HEAD request."""
  filestat = gcs_stub.head_object(filename)
  if not filestat:
    return _FakeUrlFetchResult(six.moves.http_client.NOT_FOUND, {}, '')

  http_time = common.posix_time_to_http(filestat.st_ctime)

  response_headers = {
      'x-goog-stored-content-length': filestat.st_size,
      'content-length': 0,
      'content-type': filestat.content_type,
      'etag': filestat.etag,
      'last-modified': http_time
  }

  if filestat.metadata:
    response_headers.update(filestat.metadata)

  return _FakeUrlFetchResult(six.moves.http_client.OK, response_headers, '')


def _handle_delete(gcs_stub, filename):
  """Handle DELETE object."""
  if gcs_stub.delete_object(filename):
    return _FakeUrlFetchResult(six.moves.http_client.NO_CONTENT, {}, '')
  else:
    return _FakeUrlFetchResult(six.moves.http_client.NOT_FOUND, {}, '')


class _Header(object):
  """Wrapper class for a header.

  A subclass helps to parse a specific header.
  """

  HEADER = ''
  DEFAULT = None

  def __init__(self, headers):
    """Initialize.

    Initializes self.value to the value in request header, or DEFAULT if
    not defined in headers.

    Args:
      headers: request headers.
    """
    self.value = self.DEFAULT
    for k in headers:
      if k.lower() == self.HEADER.lower():
        self.value = headers[k]
        break


class _XGoogCopySource(_Header):
  """x-goog-copy-source: /bucket/filename."""

  HEADER = 'x-goog-copy-source'


class _ContentType(_Header):
  """Content-type header."""

  HEADER = 'Content-Type'
  DEFAULT = 'application/octet-stream'


class _ContentRange(_Header):
  """Content-Range header.

  Used by resumable upload of unknown size. Possible formats:
    Content-Range: bytes 1-3/* (for uploading of unknown size)
    Content-Range: bytes */5 (for finalizing with no data)
  """

  HEADER = 'Content-Range'
  RE_PATTERN = re.compile(r'^bytes (([0-9]+)-([0-9]+)|\*)/([0-9]+|\*)$')

  def __init__(self, headers):
    super(_ContentRange, self).__init__(headers)
    if self.value:
      result = self.RE_PATTERN.match(six.ensure_str(self.value))
      if not result:
        raise ValueError('Invalid content-range header %s' % self.value,
                         six.moves.http_client.BAD_REQUEST)

      self.no_data = result.group(1) == '*'
      last = result.group(4) != '*'
      self.length = None
      if last:
        self.length = int(result.group(4))

      self.range = None
      if not self.no_data:
        self.range = (int(result.group(2)), int(result.group(3)))


class _Range(_Header):
  """_Range header.

  Used by read. Formats:
  Range: bytes=1-3
  Range: bytes=1-
  """

  HEADER = 'Range'

  def __init__(self, headers):
    super(_Range, self).__init__(headers)
    if self.value:
      start, end = self.value.rsplit('=', 1)[-1].split('-')
      start, end = int(start), int(end) if end else None
    else:
      start, end = 0, None
    self.value = start, end


def _get_param(param, param_dict, default=None):
  """Gets a parameter value from request query parameters.

  Args:
    param: name of the parameter to get.
    param_dict: a dict of request query parameters.
    default: default value if not defined.

  Returns:
    Value of the parameter or default if not defined.
  """
  result = param_dict.get(param, default)
  if param in ['max-keys'] and result:
    return int(result)
  return result
