export type AssignmentStatus = 'not_requested' | 'pending' | 'added' | 'unavailable';

export type AssignmentTransition =
  | { status: 'not_requested'; error: null }
  | { status: 'pending'; error: null }
  | { status: 'added'; error: null }
  | { status: 'unavailable'; error: 'target_album_deleted' | 'target_album_published' };

export interface AssignmentTargetState {
  exists: boolean;
  published: boolean;
  alreadyLinked: boolean;
}

export const resolveAssignment = (
  targetAlbumId: string | null,
  target: AssignmentTargetState | null,
): AssignmentTransition => {
  if (!targetAlbumId) return assignmentNotRequested();
  if (!target?.exists) return assignmentUnavailable('target_album_deleted');
  if (target.alreadyLinked) return assignmentAdded();
  if (target.published) return assignmentUnavailable('target_album_published');
  return assignmentPending();
};

export const assignmentNotRequested = (): AssignmentTransition => ({
  status: 'not_requested',
  error: null,
});

export const assignmentPending = (): AssignmentTransition => ({
  status: 'pending',
  error: null,
});

export const assignmentAdded = (): AssignmentTransition => ({
  status: 'added',
  error: null,
});

export const assignmentUnavailable = (
  reason: 'target_album_deleted' | 'target_album_published',
): AssignmentTransition => ({
  status: 'unavailable',
  error: reason,
});
