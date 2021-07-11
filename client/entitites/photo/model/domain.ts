import { createDomain } from "effector";
import { attach } from 'shared/lib/effector-log';

export const photoDomain = createDomain();

attach(photoDomain);
