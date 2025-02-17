import { Injectable } from '@angular/core';
import { isAngularInTestMode } from '@ngxs/store/internals';

import { StateOperations, StatesAndDefaults } from '../internal/internals';
import { InternalDispatcher } from '../internal/dispatcher';
import { StateStream } from './state-stream';
import { NgxsConfig } from '../symbols';
import { deepFreeze } from '../utils/freeze';

/**
 * State Context factory class
 * @ignore
 */
@Injectable()
export class InternalStateOperations {
  constructor(
    private _stateStream: StateStream,
    private _dispatcher: InternalDispatcher,
    private _config: NgxsConfig
  ) {}

  /**
   * Returns the root state operators.
   */
  getRootStateOperations(): StateOperations<any> {
    const rootStateOperations = {
      getState: () => this._stateStream.getValue(),
      setState: (newState: any) => this._stateStream.next(newState),
      dispatch: (actionOrActions: any | any[]) => this._dispatcher.dispatch(actionOrActions)
    };

    // We have to have that duplication since this will allow us to tree-shake `ensureStateAndActionsAreImmutable`
    // and `deepFreeze` in Ivy production build.
    // The below `if` condition checks 2 things:
    // 1) if we're in View Engine (`ngDevMode` is `undefined`)
    // 2) if we're running tests, we should fallback to `config.developmentMode` to be backwards-compatible
    if (typeof ngDevMode === 'undefined' || (ngDevMode && isAngularInTestMode())) {
      return this._config.developmentMode
        ? ensureStateAndActionsAreImmutable(rootStateOperations)
        : rootStateOperations;
    } else {
      // If we're in Ivy and not running tests, then tree-shake `ensureStateAndActionsAreImmutable` and `deepFreeze`.
      return ngDevMode
        ? ensureStateAndActionsAreImmutable(rootStateOperations)
        : rootStateOperations;
    }
  }

  setStateToTheCurrentWithNew(results: StatesAndDefaults): void {
    const stateOperations: StateOperations<any> = this.getRootStateOperations();

    // Get our current stream
    const currentState = stateOperations.getState();
    // Set the state to the current + new
    stateOperations.setState({ ...currentState, ...results.defaults });
  }
}

function ensureStateAndActionsAreImmutable(root: StateOperations<any>): StateOperations<any> {
  return {
    getState: () => root.getState(),
    setState: value => {
      const frozenValue = deepFreeze(value);
      return root.setState(frozenValue);
    },
    dispatch: actions => {
      return root.dispatch(actions);
    }
  };
}
