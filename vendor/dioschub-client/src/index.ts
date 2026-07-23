/**
 * @intrigsoft/dioschub-client
 *
 * Client SDK for the Diosc AI Assistant Kit.
 *
 * - Types for the diosc() command-queue API
 * - loadDiosc() — script injection + command queue setup
 * - Global augmentations (Window.diosc, JSX <diosc-chat>)
 */

// Type definitions
export type {
  DioscConfig,
  BoundIdentity,
  BoundRole,
  NavigationData,
  NavigationObserverCallback,
  BrowserToolHandler,
  ApprovalRequest,
  ApprovalToolCall,
  ApprovalActions,
  ApprovalValidationError,
  ApprovalHandler,
  SessionEventName,
  ServerEventName,
  ProtocolEventName,
  EventHandler,
  WildcardEventHandler,
  Unsubscribe,
  DioscCommand,
  BrowserAdapter,
  PageSnapshot,
  IntentDefinition,
  IntentApproval,
  IntentResult,
  JsonSchema,
  MentionItem,
  MentionQuery,
} from './types';

// DioscFunction overloads (re-exported from globals)
export type { DioscFunction, DioscEngineHandle } from './globals';

// Typed instance API (the supported entry point)
export { createDiosc } from './create-diosc';
export type {
  CreateDioscOptions,
  DioscInstance,
  DioscUi,
  DioscExtend,
  DioscIdentity,
  SendOptions,
  WidgetPosition,
} from './create-diosc';

// Script loader
export { loadDiosc } from './loader';
export type { LoadDioscOptions, LoadDioscResult } from './loader';

// Side-effect: pull in global augmentations (Window, JSX)
import './globals';
