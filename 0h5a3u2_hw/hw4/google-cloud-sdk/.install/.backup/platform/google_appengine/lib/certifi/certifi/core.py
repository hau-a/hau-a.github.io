import os


def where():
  f = os.path.dirname(__file__)

  return os.path.join(f, 'cacerts.txt')
