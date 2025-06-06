global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  })
);

global.Headers = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  forEach: jest.fn(),
}));

global.Request = jest.fn().mockImplementation((input, init) => ({
  ...input,
  ...init,
}));

global.Response = jest.fn().mockImplementation((body, init) => ({
  ...body,
  ...init,
}));

global.URL = jest.fn().mockImplementation((url) => ({
  href: url,
  origin: 'https://example.org',
  protocol: 'https:',
  username: '',
  password: '',
  host: 'example.org',
  hostname: 'example.org',
  port: '',
  pathname: '/',
  search: '',
  searchParams: new URLSearchParams(),
  hash: '',
  toJSON: () => url,
}));

global.URLSearchParams = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  sort: jest.fn(),
  forEach: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  [Symbol.iterator]: jest.fn(),
})); 