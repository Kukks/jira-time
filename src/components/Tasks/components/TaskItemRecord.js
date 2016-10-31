import React, { Component, PropTypes } from 'react';
import Elapsed from 'elapsed';

import './TaskItemRecord.scss';

export class TaskItemRecord extends Component {

  static propTypes = {
    record: PropTypes.object.isRequired
  }

  render () {

    const { record } = this.props;

    const startTime = new Date(record.startTime).toLocaleString();
    const endTime = record.endTime ? new Date(record.endTime).toLocaleString() : null;
    const elapsedTime = record.endTime ? new Elapsed(record.startTime, record.endTime).optimal : null;

    return (
      <div className='task-item-record'>
        <span className='task-item-record__start-time'>{startTime}</span>
        <span className='task-item-record__end-time'>{endTime}</span>
        <span className='task-item-record__end-time'>{elapsedTime}</span>
      </div>
    );
  }
}

export default TaskItemRecord;