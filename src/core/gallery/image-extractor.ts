/**
 * Image Context and Gallery Extractor
 * Extracts all <img> URLs in order and indexes each image node for preview sync.
 */

import { ASTNode, ImageGalleryItem } from '../types/ast';

export interface GalleryExtractionResult {
  galleryList: string[];
  rawImages: ImageGalleryItem[];
}

/**
 * Traverses AST to extract images and attach gallery index to node.extra
 */
export function extractGallery(nodes: ASTNode[]): GalleryExtractionResult {
  const galleryList: string[] = [];
  const rawImages: ImageGalleryItem[] = [];

  function traverse(node: ASTNode) {
    if (node.name === 'img') {
      const src = node.attrs.src || node.attrs['data-src'];
      if (src) {
        const index = galleryList.length;
        galleryList.push(src);

        rawImages.push({
          index,
          src,
          alt: node.attrs.alt,
          width: node.attrs.width,
          height: node.attrs.height
        });

        if (!node.extra) {
          node.extra = {};
        }
        node.extra.galleryIndex = index;
      }
    }

    if (node.extra?.isSvgCarousel && node.extra?.carouselSlides) {
      for (const slide of node.extra.carouselSlides) {
        if (slide.src) {
          const index = galleryList.length;
          galleryList.push(slide.src);
          rawImages.push({
            index,
            src: slide.src,
            alt: slide.title,
            width: slide.width,
            height: slide.height
          });
        }
      }
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return {
    galleryList,
    rawImages
  };
}
