const ExitStatus = {
  open:'open',
  closed:'closed',
  locked:'locked',
  unlocked:'unlocked'
} as const;

type ExitStatus = typeof ExitStatus[keyof typeof ExitStatus];

export default ExitStatus;
