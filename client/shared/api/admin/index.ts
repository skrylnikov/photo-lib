import ky from "ky";


export const reindex = async () => {
  return await ky.get('/api/reindex');
};
