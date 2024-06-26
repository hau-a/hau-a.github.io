# -*- coding: utf-8 -*- #
# Copyright 2023 Google LLC. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Command for describing instance settings."""

from __future__ import absolute_import
from __future__ import division
from __future__ import unicode_literals

from googlecloudsdk.api_lib.compute import base_classes
from googlecloudsdk.calliope import base
from googlecloudsdk.command_lib.compute.instance_settings import flags
from googlecloudsdk.core import properties


@base.ReleaseTracks(base.ReleaseTrack.ALPHA)
@base.Hidden
class Describe(base.DescribeCommand):
  """Describe zonal instance settings."""

  detailed_help = {
      'EXAMPLES': """
        To describe the instance settings in the zone called ``us-central1-a''
        in the project ``my-gcp-project'', run:

          $ {command} --zone=us-central1-a --project=my-gcp-project
      """
  }

  @staticmethod
  def Args(parser):
    flags.AddDescribeInstanceSettingsFlags(parser)

  def Run(self, args):
    holder = base_classes.ComputeApiHolder(self.ReleaseTrack())
    client = holder.client
    service = client.apitools_client.instanceSettings
    request = client.messages.ComputeInstanceSettingsGetRequest(
        project=properties.VALUES.core.project.GetOrFail(), zone=args.zone
    )

    return client.MakeRequests(
        [(service, 'Get', request)], enable_single_request=True
    )[0]
