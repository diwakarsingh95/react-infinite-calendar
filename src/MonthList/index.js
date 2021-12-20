import React, { Component } from 'react';
import PropTypes from 'prop-types';
import VirtualList from 'react-tiny-virtual-list';
import classNames from 'classnames';
import { emptyFn, getMonth, getWeek, getWeeksInMonth, animate } from '../utils';
import parse from 'date-fns/parse';
import startOfMonth from 'date-fns/start_of_month';
import Month from '../Month';
import styles from './MonthList.scss';
import { isDate, isValid } from 'date-fns';

const AVERAGE_ROWS_PER_MONTH = 5;

export default class MonthList extends Component {
  static propTypes = {
    disabledDates: PropTypes.arrayOf(PropTypes.string),
    disabledDays: PropTypes.arrayOf(PropTypes.number),
    height: PropTypes.number,
    isScrolling: PropTypes.bool,
    locale: PropTypes.object,
    maxDate: PropTypes.instanceOf(Date),
    min: PropTypes.instanceOf(Date),
    minDate: PropTypes.instanceOf(Date),
    months: PropTypes.arrayOf(PropTypes.object),
    onDaySelect: PropTypes.func,
    onScroll: PropTypes.func,
    overscanMonthCount: PropTypes.number,
    rowHeight: PropTypes.number,
    selectedDate: PropTypes.instanceOf(Date),
    showOverlay: PropTypes.bool,
    theme: PropTypes.object,
    today: PropTypes.instanceOf(Date),
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  };
  state = {
    scrollTop: this.getDateOffset(this.props.scrollDate),
  };
  cache = {};
  memoize = function (param) {
    if (!this.cache[param]) {
      const {
        locale: { weekStartsOn },
      } = this.props;
      const [year, month] = param.split(':');
      const result = getMonth(year, month, weekStartsOn);
      this.cache[param] = result;
    }
    return this.cache[param];
  };
  monthHeights = [];

  _getRef = (instance) => {
    this.VirtualList = instance;
  };

  getMonthHeight = (index) => {
    if (!this.monthHeights[index]) {
      let {
        locale: { weekStartsOn },
        months,
        rowHeight,
      } = this.props;
      let { month, year } = months[index];
      let { rows } = this.memoize(`${year}:${month}`);
      let weeks = getWeeksInMonth(
        month,
        year,
        weekStartsOn,
        index === months.length - 1
      );
      let height = weeks * rowHeight;
      this.monthHeights[index] =
        height + (rows[rows.length - 1].length === 7 ? 49 : 105);
    }

    return this.monthHeights[index];
  };

  componentDidMount() {
    this.scrollEl = this.VirtualList.rootNode;
  }

  componentWillReceiveProps({ scrollDate }) {
    if (scrollDate !== this.props.scrollDate) {
      this.setState({
        scrollTop: this.getDateOffset(scrollDate),
      });
    }
  }

  getDateOffset() {
    const { focusOnDate, selected } = this.props;
    const date = new Date();
    const today_month = new Date().getMonth() + 1;
    const today_year = new Date().getFullYear();
    let dep_date;
    if (selected.start) {
      const dateToScroll =
        focusOnDate == 'depart' ? selected.start : selected.end;
      dep_date = new Date(dateToScroll).toLocaleDateString('en-US', {
        timeZone: 'UTC',
      });
    }
    let pixelToScroll = 0;
    let month_iterate =
      (new Date(dep_date).getFullYear() - date.getFullYear()) * 12;
    month_iterate -= date.getMonth();
    month_iterate += new Date(dep_date).getMonth();
    month_iterate = month_iterate <= 0 ? 0 : month_iterate;
    let yearIterate = today_year;
    for (let i = 1; i <= month_iterate; i++) {
      let j = i % 13;
      if (new Date(yearIterate, today_month - 1 + j, 0).getDate() == 31) {
        if (new Date(yearIterate, today_month - 2 + j, 1).getDay() <= 4) {
          pixelToScroll += 329;
        } else {
          pixelToScroll += 385;
        }
      } else if (
        new Date(yearIterate, today_month - 1 + j, 0).getDate() == 30
      ) {
        if (new Date(yearIterate, today_month - 2 + j, 1).getDay() == 6) {
          pixelToScroll += 385;
        } else {
          pixelToScroll += 329;
        }
      } else {
        if (
          new Date(yearIterate, today_month - 2 + j, 1).getDay() == 0 &&
          new Date(yearIterate, today_month - 1 + j, 0).getDate() == 28
        ) {
          pixelToScroll += 274;
        } else {
          pixelToScroll += 329;
        }
      }
      yearIterate = j == 12 ? yearIterate + 1 : yearIterate;
    }
    let rowsToScrollReturnPixels = 0;
    let return3rowsMinus = 0;
    if (focusOnDate == 'return') {
      let return_date = parseInt(String(selected.end).split('-')[2]);
      let firstDayOn = new Date(
        new Date(selected.end).getFullYear(),
        new Date(selected.end).getMonth(),
        1
      ).getDay();
      let rowsToScroll =
        return_date - (6 - firstDayOn + 1) <= 0
          ? 0
          : (return_date - (6 - firstDayOn + 1)) % 7 == 0
            ? parseInt((return_date - (6 - firstDayOn + 1)) / 7)
            : parseInt((return_date - (6 - firstDayOn + 1)) / 7) + 1;
      rowsToScrollReturnPixels = rowsToScroll * 56 + 33;
      return3rowsMinus =
        rowsToScroll >= 4
          ? 56 * 4
          : rowsToScroll == 3
          ? 56 * 3 + 33
          : 56 * 3 + 50;
    }
    return pixelToScroll + rowsToScrollReturnPixels - return3rowsMinus;
  }

  scrollToDate = (date, offset = 0, ...rest) => {
    let offsetTop = this.getDateOffset(date);
    this.scrollTo(offsetTop + offset, ...rest);
  };

  scrollTo = (scrollTop = 0, shouldAnimate = false, onScrollEnd = emptyFn) => {
    const onComplete = () =>
      setTimeout(() => {
        this.scrollEl.style.overflowY = 'auto';
        onScrollEnd();
      });

    // Interrupt iOS Momentum scroll
    this.scrollEl.style.overflowY = 'hidden';

    if (shouldAnimate) {
      /* eslint-disable sort-keys */
      animate({
        fromValue: this.scrollEl.scrollTop,
        toValue: scrollTop,
        onUpdate: (scrollTop, callback) =>
          this.setState({ scrollTop }, callback),
        onComplete,
      });
    } else {
      window.requestAnimationFrame(() => {
        this.scrollEl.scrollTop = scrollTop;
        onComplete();
      });
    }
  };

  renderMonth = ({ index, style }) => {
    let {
      DayComponent,
      disabledDates,
      disabledDays,
      locale,
      maxDate,
      minDate,
      months,
      passThrough,
      rowHeight,
      selected,
      showOverlay,
      theme,
      today,
    } = this.props;

    let { month, year } = months[index];
    let key = `${year}:${month}`;
    let { date, rows } = this.memoize(key);

    return (
      <Month
        key={key}
        selected={selected}
        DayComponent={DayComponent}
        monthDate={date}
        disabledDates={disabledDates}
        disabledDays={disabledDays}
        maxDate={maxDate}
        minDate={minDate}
        rows={rows}
        rowHeight={rowHeight}
        isScrolling={false}
        showOverlay={showOverlay}
        today={today}
        theme={theme}
        style={{ ...style }}
        locale={locale}
        passThrough={passThrough}
        {...passThrough.Month}
      />
    );
  };

  render() {
    let {
      height,
      isScrolling,
      onScroll,
      overscanMonthCount,
      months,
      rowHeight,
      width,
    } = this.props;
    const { scrollTop } = this.state;

    return (
      <VirtualList
        ref={this._getRef}
        width={width}
        height={height}
        itemCount={months.length}
        itemSize={this.getMonthHeight}
        estimatedItemSize={rowHeight * AVERAGE_ROWS_PER_MONTH}
        renderItem={this.renderMonth}
        onScroll={onScroll}
        scrollOffset={scrollTop}
        className={classNames(styles.root, { [styles.scrolling]: isScrolling })}
        style={{ lineHeight: `${rowHeight}px` }}
        overscanCount={overscanMonthCount}
      />
    );
  }
}
