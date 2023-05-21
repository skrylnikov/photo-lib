import { createDomain } from 'effector';
import { attach } from 'shared/lib/effector-log';

const menuDomain = createDomain();

attach(menuDomain);

export const changeOpenned = menuDomain.createEvent<unknown>();

export const $openned = menuDomain
  .createStore(true)
  .on(changeOpenned, (state) => !state)
;

