// Test stub for @/api/base44Client. Import-time only: the tested modules call
// data paths that are never exercised by unit tests, so every entity resolves
// to empty results and functions return null data.
const emptyList = async () => [];
const nullGet = async () => null;

export const base44 = {
  entities: new Proxy(
    {},
    {
      get: () => ({ list: emptyList, filter: emptyList, get: nullGet }),
    },
  ),
  functions: { invoke: async () => ({ data: null }) },
  auth: { me: async () => null },
};
