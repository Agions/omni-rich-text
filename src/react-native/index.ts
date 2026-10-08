/**
 * omni-rich-text/react-native
 *
 * React Native adapter for Omni Rich Text.
 * Renders HTML / Markdown AST nodes using native RN primitives.
 */

export { OmniRichText, UniversalRichText } from './components/UniversalRichText';
export { RnNodeRenderer } from './components/RnNodeRenderer';
export type {
  OmniRichTextProps,
  UniversalRichTextProps,
  ThemeConfig,
  TruncateOptions,
  ASTNode,
  LinkTapContext,
  MediaEventPayload
} from './types';

