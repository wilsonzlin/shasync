export type FilesList = string[];

export const HASH_TYPE = 'sha512';
export const REMOTE_FILE_METADATA_KEY_HASH = 'SHASYNC_HASH';

export const normaliseFilePath = (path: string): string => {
  // Normalise for easier sync between remote (/) and Windows-based local (\)
  return path.replace(/[\\\/]+/g, '/');
};
