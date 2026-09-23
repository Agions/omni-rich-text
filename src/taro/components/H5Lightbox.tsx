import React, { useState, useEffect, useCallback } from 'react';
import { View, Image, Text } from '@tarojs/components';

export interface H5LightboxProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const H5Lightbox: React.FC<H5LightboxProps> = ({
  visible,
  images,
  initialIndex,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrev = useCallback((e: any) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback((e: any) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  if (!visible || images.length === 0) return null;

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      {/* Index indicator */}
      <View
        style={{
          position: 'absolute',
          top: 20,
          color: '#fff',
          fontSize: 16,
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '4px 12px',
          borderRadius: 16
        }}
      >
        <Text>{`${currentIndex + 1} / ${images.length}`}</Text>
      </View>

      {/* Main Image */}
      <Image
        src={images[currentIndex]}
        mode="aspectFit"
        style={{
          maxWidth: '92vw',
          maxHeight: '80vh'
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Navigation Arrows for multi images */}
      {images.length > 1 && (
        <>
          <View
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              fontSize: 32,
              padding: '12px 16px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={handlePrev}
          >
            ‹
          </View>
          <View
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#fff',
              fontSize: 32,
              padding: '12px 16px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={handleNext}
          >
            ›
          </View>
        </>
      )}
    </View>
  );
};
