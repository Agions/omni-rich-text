/**
 * Utilities for extracting and calculating image dimensions and aspect ratios for CLS optimization.
 */

export interface ImageDimensionResult {
  aspectRatio?: number;
  placeholderHeight?: string;
  dataRatio?: number;
}

/**
 * Calculates aspect ratio and placeholder height from img attributes and style
 */
export function calculateImageDimensions(
  attrs: Record<string, string>,
  styleObj?: Record<string, string>
): ImageDimensionResult {
  const result: ImageDimensionResult = {};

  // 1. Check data-ratio (standard in WeChat articles, e.g. 0.5625 = 9 / 16)
  if (attrs['data-ratio']) {
    const r = parseFloat(attrs['data-ratio']);
    if (!isNaN(r) && r > 0) {
      result.dataRatio = r;
      result.placeholderHeight = `${(r * 100).toFixed(2)}%`;
      result.aspectRatio = parseFloat((1 / r).toFixed(4));
      return result;
    }
  }

  // 2. Check data-w and data-h (WeChat image resolution)
  const dataW = parseFloat(attrs['data-w']);
  const dataH = parseFloat(attrs['data-h']);
  if (!isNaN(dataW) && !isNaN(dataH) && dataW > 0 && dataH > 0) {
    const ratio = dataH / dataW;
    result.dataRatio = ratio;
    result.placeholderHeight = `${(ratio * 100).toFixed(2)}%`;
    result.aspectRatio = parseFloat((dataW / dataH).toFixed(4));
    return result;
  }

  // 3. Check width and height HTML attributes
  const attrW = parseFloat(attrs.width);
  const attrH = parseFloat(attrs.height);
  if (!isNaN(attrW) && !isNaN(attrH) && attrW > 0 && attrH > 0) {
    const ratio = attrH / attrW;
    result.dataRatio = ratio;
    result.placeholderHeight = `${(ratio * 100).toFixed(2)}%`;
    result.aspectRatio = parseFloat((attrW / attrH).toFixed(4));
    return result;
  }

  // 4. Check inline style width and height
  if (styleObj) {
    const styleW = parseFloat(styleObj.width);
    const styleH = parseFloat(styleObj.height);
    if (!isNaN(styleW) && !isNaN(styleH) && styleW > 0 && styleH > 0) {
      const ratio = styleH / styleW;
      result.dataRatio = ratio;
      result.placeholderHeight = `${(ratio * 100).toFixed(2)}%`;
      result.aspectRatio = parseFloat((styleW / styleH).toFixed(4));
      return result;
    }
  }

  return result;
}
