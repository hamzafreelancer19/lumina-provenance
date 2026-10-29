export type Workflow =
  | 'idle'
  | 'auditing'
  | 'audited'
  | 'cleaning'
  | 'cleaned'
  | 'error';

export type GroupStatus =
  | 'found'
  | 'clear'
  | 'detected'
  | 'unavailable'
  | 'verified'
  | 'invalid'
  | 'unverified'
  | 'none';

export type MetaGroup = {
  id: string;
  label: string;
  status: GroupStatus;
  detail: string;
  fields: string[];
};

export type Audit = {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  groups: MetaGroup[];
};

export type CleanResult = {
  blob: Blob;
  name: string;
  size: number;
  removed: number;
  url: string;
};

export type C2paState =
  | 'trusted'
  | 'valid'
  | 'invalid'
  | 'unverified'
  | 'none'
  | 'unsupported'
  | 'error';

export type C2paClaim = {
  state: C2paState;
  detail: string;
  fields: string[];
};
