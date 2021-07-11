import { indexStorage } from "./index-storage";

export { reindexStorage } from './index-storage';

export const launch = () => {
  void indexStorage();
};
