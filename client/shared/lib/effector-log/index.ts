import { Domain } from 'effector';
import { attachLogger } from 'effector-logger/attach';

export const attach = (domain: Domain) => {
  attachLogger(domain, {
    reduxDevtools: 'disabled',
    inspector: 'disabled',
    // console: 'disabled',
  });
};
