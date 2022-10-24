sap.ui.define(
  [
    // prettier 방지용 주석
  ],
  () =>
    // prettier 방지용 주석
    {
      ('use strict');

      const TimeUtils = {
        i9Hours: 9 * 60 * 60 * 1000,
        sEdmTimeFormat: '[PT]HH[H]mm[M]ss[S]',

        nvl(mEdmTime) {
          if (!mEdmTime || !_.isObject(mEdmTime) || !_.has(mEdmTime, 'ms')) {
            return null;
          }

          return _.isEqual(mEdmTime.ms, 0) ? null : mEdmTime;
        },

        diff(mStart, mEnd) {
          if (_.has(mStart, 'ms') && _.has(mEnd, 'ms')) {
            const dBeguz = mEnd.ms !== 0 && mStart.ms > mEnd.ms ? moment.utc(mStart.ms).subtract(1, 'days') : moment.utc(mStart.ms);
            const dEnduz = mStart.ms !== 0 && mEnd.ms === 0 ? moment.utc(0).add(1, 'days') : moment.utc(mEnd.ms);

            return _.toString(moment.duration(dEnduz.diff(dBeguz)).abs().asHours());
          }

          return '';
        },

        toEdm(sTimeString = '0000') {
          return {
            ms: moment.utc(sTimeString, 'hhmm').set({ year: 1970, month: 0, date: 1 }).valueOf(),
            __edmType: 'Edm.Time',
          };
        },

        toString(mEdmTime, sTimeFormat = this.sEdmTimeFormat) {
          if (!mEdmTime || !_.isObject(mEdmTime) || !_.has(mEdmTime, 'ms') || _.isNaN(mEdmTime.ms)) {
            return null;
          }

          return moment.utc(mEdmTime.ms).format(sTimeFormat);
        },

        stepMinutes(sSourceMinutes, iStep = 30) {
          const iMinutesRemainder = _.chain(sSourceMinutes).toNumber().divide(iStep).value();

          return _.isInteger(iMinutesRemainder) ? sSourceMinutes : _.chain(iMinutesRemainder).floor().multiply(iStep).toString().value();
        },

        convert2400Time(mData) {
          _.forOwn(mData, (v, p) => {
            if (_.isObject(v) && _.has(v, 'ms') && _.chain(v).get('ms').isEqual(86400000).value()) {
              _.set(mData, p, 'P00DT24H00M00S');
            }
          });

          return mData;
        },

        convertEdmTimeToString(mData) {
          _.forOwn(mData, (v, p) => {
            if (_.isObject(v) && _.has(v, 'ms') && _.chain(v).get('ms').isEqual(86400000).value()) {
              _.set(mData, p, 'P00DT24H00M00S');
            }
          });
        },

        format(vValue, sTimeFormat = 'HH:mm') {
          if (!vValue || (_.has(vValue, 'ms') && _.isEqual(vValue.ms, 0))) {
            return null;
          }

          if (typeof vValue === 'string' || vValue instanceof String) {
            const sTimeString = vValue.replace(/[^\d]/g, '');
            return moment(`19700101${sTimeString}`, 'YYYYMMDDHHmmss').format(sTimeFormat);
          } else if (_.has(vValue, 'ms')) {
            return this.toString(vValue, sTimeFormat);
          }
        },
      };

      return TimeUtils;
    }
);
