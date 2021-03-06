import React, { Component, PropTypes } from 'react';
import RecordItem from 'modules/RecordItem';
import RecordModel from 'store/models/RecordModel';

import { getIssue, setIssueRemaining } from 'shared/jiraClient';

import LoadingIcon from 'assets/loading.svg';
import RefreshIcon from 'assets/refresh.svg';
import PlusIcon from 'assets/plus.svg';

import './TaskItem.scss';

let focusingOnRemaining = false;

export class TaskItem extends Component {

  static get propTypes () {
    return {
      task: PropTypes.object.isRequired,
      records: PropTypes.array.isRequired,
      removeTask: PropTypes.func.isRequired,
      addRecord: PropTypes.func.isRequired,
      startRecording: PropTypes.func.isRequired,
      refreshIssue: PropTypes.func.isRequired,
      setIssueRefreshing: PropTypes.func.isRequired,
      movingRecord: PropTypes.object
    };
  }

  constructor (props) {
    super(props);

    this.onRemoveClick = this.onRemoveClick.bind(this);
    this.onStartPassiveLogClick = this.onStartPassiveLogClick.bind(this);
    this.onStartActiveLogClick = this.onStartActiveLogClick.bind(this);
    this.onIssueRefreshClick = this.onIssueRefreshClick.bind(this);
    this.onRemainignBlur = this.onRemainignBlur.bind(this);

    this.state = {};
  }

  componentWillUpdate () {
    if (this.props.task && this.props.task.issue) {
      this.setRemainingInputValue(this.props.task.issue.fields.timetracking.remainingEstimate);
    }
  }

  onRemoveClick () {
    this.props.removeTask({ cuid: this.props.task.cuid });
  }

  onStartPassiveLogClick () {
    const { task } = this.props;

    const startTime = new Date();
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + 1);

    this.props.addRecord({
      task,
      record: RecordModel({
        task,
        startTime,
        endTime
      })
    });
  }

  onStartActiveLogClick () {
    const { task } = this.props;

    this.props.startRecording({
      task,
      record: RecordModel({ task })
    });
  }

  onIssueRefreshClick () {
    const { task } = this.props;

    this.props.setIssueRefreshing({
      cuid: task.cuid,
      refreshing: true
    });

    getIssue({
      key: task.issue.key
    })
    .then((issue) => {

      this.props.refreshIssue({
        cuid: task.cuid,
        issue
      });

      this.setRemainingInputValue(issue.fields.timetracking.remainingEstimate);
    });
  }

  setRemainingInputValue (remaining) {
    if (!focusingOnRemaining) {
      const remInp = this.refs.inputRemaining;
      if (remInp && remInp.value !== remaining) {
        remInp.value = remaining;
      }
    }
  }

  onRemainignFocus (e) {
    focusingOnRemaining = true;
  }

  onRemainignBlur (e) {

    focusingOnRemaining = false;

    const remainingEstimate = e.target.value;

    const { task } = this.props;

    this.props.setIssueRefreshing({
      cuid: task.cuid,
      refreshing: true,
      remainingEstimate
    });

    getIssue({
      key: task.issue.key
    })
    .then((issue) => {

      // Ensure that our remaining estimate gets persisted
      issue.fields.timetracking.remainingEstimate = remainingEstimate;

      this.props.refreshIssue({
        cuid: task.cuid,
        issue
      });

      setIssueRemaining({
        id: task.issue.key,
        remainingEstimate,

        /*
          We need to send the original estimate along due to a bug in the JIRA REST API:
          https://jira.atlassian.com/browse/JRA-30459
        */
        originalEstimate: issue.fields.timetracking.originalEstimate
      });
    });
  }

  render () {

    const { task, records, movingRecord } = this.props;

    let className = 'task-item';

    if (movingRecord && movingRecord.taskDroppableCuid === task.cuid) {
      className += ' task-item--drop-active';
    }

    let recordItems = records.map((record) => {
      return <RecordItem recordCuid={record.cuid} record={record} key={record.cuid} />;
    });

    let refreshIcon;

    // This task does have a JIRA issue
    if (task.issue) {

      // There are errors with the task. Display that instead of issue info
      if (task.issue.errorMessages && task.issue.errorMessages.length > 0) {
        return (
          <div className='task-item task-item--errors'>
            <div className='task-item-info'>
              <button className='task-item__remove' onClick={this.onRemoveClick}>x</button>
              <span className='task-item__summary'>
                {task.issue.errorMessages.map((e, i) => <div key={i}>{e}</div>)}
              </span>
            </div>
            <div className='records'>{recordItems}</div>
          </div>
        );
      }

      refreshIcon = (
        <span className='task-item__issue-refresh'
          title='Click to refresh the JIRA issue, yo!'
          onClick={this.onIssueRefreshClick}>
          <img src={RefreshIcon} alt='Refresh' className='task-item__issue-refresh-image' />
        </span>
      );
    }
    if (task.issueRefreshing) {
      refreshIcon = (
        <span className='task-item__issue-refresh'>
          <img src={LoadingIcon} alt='Loading' className='task-item__loading' />
        </span>
      );
    }

    let remainingEstimate = task.issue.fields.timetracking.remainingEstimate;
    if (!remainingEstimate || remainingEstimate === 'undefined') {
      remainingEstimate = null;
    }

    // Output the task
    return (
      <div className={className} data-cuid={task.cuid} data-taskissuekey={task.issue ? task.issue.key : null}>
        <div className='task-item-info'>
          <button className='task-item__remove' onClick={this.onRemoveClick}>x</button>
          <span className='task-item__key'>
            {refreshIcon}
            <a href={'/browse/' + task.issue.key} target='_blank'>{task.issue.key}</a>
          </span>
          <span className='task-item__summary'>{task.issue.fields.summary}</span>
          <input className='task-item__remaining'
            defaultValue={remainingEstimate}
            onFocus={this.onRemainignFocus}
            onBlur={this.onRemainignBlur}
            ref='inputRemaining'
            disabled={!!movingRecord}
          />
          <button className='task-item__log task-item__log--passive'
            title='Add a worklog'
            onClick={this.onStartPassiveLogClick}>
            <img src={PlusIcon} className='task-item__log-icon' alt='Plus' />
          </button>
          <button className='task-item__log task-item__log--active'
            title='Start new worklog'
            onClick={this.onStartActiveLogClick}>●</button>
        </div>
        <div className='records'>{recordItems}</div>
      </div>
    );
  }
}

export default TaskItem;
