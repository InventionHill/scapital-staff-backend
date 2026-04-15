import moment from 'moment';

export const getMillisecondsUntilDate = (date: moment.MomentInput): number => {
  const momentDate = moment(date).format('YYYY-MM-DD');

  return moment(momentDate).diff(moment());
};

export const isUndefined = (value: unknown): value is undefined =>
  typeof value === 'undefined';

export const isNull = (value: unknown): value is null => value === null;
