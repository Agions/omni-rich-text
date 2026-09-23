import React from 'react';

export const View: React.FC<any> = ({ className, style, onClick, children, ...rest }) => (
  <div className={className} style={style} onClick={onClick} {...rest}>
    {children}
  </div>
);

export const Text: React.FC<any> = ({ className, style, onClick, children, ...rest }) => (
  <span className={className} style={style} onClick={onClick} {...rest}>
    {children}
  </span>
);

export const Image: React.FC<any> = ({ className, style, onClick, src, mode, ...rest }) => (
  <img className={className} style={style} onClick={onClick} src={src} alt="" {...rest} />
);

export const Video: React.FC<any> = ({ className, style, src, poster, controls, ...rest }) => (
  <video className={className} style={style} src={src} poster={poster} controls={controls} {...rest} />
);

export const Audio: React.FC<any> = ({ className, style, src, poster, controls, ...rest }) => (
  <audio className={className} style={style} src={src} controls={controls} {...rest} />
);

export const Button: React.FC<any> = ({ className, style, onClick, children, ...rest }) => (
  <button className={className} style={style} onClick={onClick} {...rest}>
    {children}
  </button>
);

export const ScrollView: React.FC<any> = ({ className, style, scrollX, scrollY, children, ...rest }) => (
  <div
    className={className}
    style={{
      ...style,
      overflowX: scrollX ? 'auto' : undefined,
      overflowY: scrollY ? 'auto' : undefined,
      WebkitOverflowScrolling: 'touch'
    }}
    {...rest}
  >
    {children}
  </div>
);
