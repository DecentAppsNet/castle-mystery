const ExitType = {
  doorway:'doorway',
  door:'door',
  lockableDoor:'lockableDoor'
} as const;

type ExitType = typeof ExitType[keyof typeof ExitType];

export default ExitType;
