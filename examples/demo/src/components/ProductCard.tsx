import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { ASTNode } from 'omni-rich-text/core';

export interface ProductCardProps {
  node: ASTNode;
  attrs: Record<string, string>;
  children?: React.ReactNode;
  onNodeEvent?: (eventType: string, node: ASTNode, rawEvent: any) => void;
  onLinkClick?: (href: string, node: ASTNode) => void;
  [key: string]: any;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  node,
  attrs,
  onNodeEvent,
  onLinkClick
}) => {
  const {
    title = '微信精选优质图书 / 智能硬件',
    subtitle = '官方严选品质，全国包邮送达',
    price = '129.00',
    'original-price': originalPrice = '199.00',
    tag = '精选好物',
    image = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop',
    link = 'https://mp.weixin.qq.com'
  } = attrs;

  const handleClick = (e: any) => {
    e.stopPropagation?.();
    Taro.showToast({
      title: `点击商品: ${title}`,
      icon: 'none',
      duration: 2000
    });
    if (link && onLinkClick) {
      onLinkClick(link, node);
    }
    onNodeEvent?.('click', node, e);
  };

  return (
    <View
      className="urt-custom-product-card"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        margin: '14px 0',
        padding: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #eeeeee',
        borderRadius: 10,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    >
      {/* Product Image */}
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
          flexShrink: 0,
          marginRight: 12
        }}
      >
        <Image
          src={image}
          mode="aspectFill"
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </View>

      {/* Product Information */}
      <View
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          height: 84
        }}
      >
        <View>
          <View style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            {tag && (
              <Text
                style={{
                  fontSize: 10,
                  color: '#e02020',
                  backgroundColor: '#fee2e2',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 'bold',
                  marginRight: 6,
                  flexShrink: 0
                }}
              >
                {tag}
              </Text>
            )}
            <Text
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#222222',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {title}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: '#888888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 4
          }}
        >
          <View style={{ display: 'flex', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 12, color: '#e02020', fontWeight: 'bold' }}>¥</Text>
            <Text
              style={{
                fontSize: 18,
                color: '#e02020',
                fontWeight: 'bold',
                marginLeft: 2
              }}
            >
              {price}
            </Text>
            {originalPrice && (
              <Text
                style={{
                  fontSize: 11,
                  color: '#aaaaaa',
                  textDecoration: 'line-through',
                  marginLeft: 6
                }}
              >
                ¥{originalPrice}
              </Text>
            )}
          </View>

          <View
            style={{
              backgroundColor: '#07c160',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: '500'
            }}
          >
            <Text style={{ color: '#ffffff' }}>立即抢购</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
