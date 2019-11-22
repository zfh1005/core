import * as React from 'react';
import * as styles from './resize.module.less';
import classnames from 'classnames';

export interface ResizeHandleProps {
  onFinished?: () => void;
  onResize?: (prevElement: HTMLElement, nextElement: HTMLElement) => void;
  max?: number;
  min?: number;
  preserve?: number; // percentage
  className?: string;
  noColor?: boolean;
  delegate?: (delegate: IResizeHandleDelegate) => void;
  findPrevElement?: (direction?: boolean) => HTMLElement | undefined;
  findNextElement?: (direction?: boolean) => HTMLElement | undefined;
}

export interface IResizeHandleDelegate {
  setSize(prev: number, next: number): void;
  setAbsoluteSize(size: number, isLatter?: boolean, keep?: boolean): void;
  getAbsoluteSize(isLatter?: boolean): number;
}

function preventWebviewCatchMouseEvents() {
  const iframes = document.getElementsByTagName('iframe');
  const webviews = document.getElementsByTagName('webviews');
  for (const webview of webviews as any) {
    webview.classList.add('none-pointer-event');
  }
  for (const iframe of iframes as any) {
    iframe.classList.add('none-pointer-event');
  }
}

function allowWebviewCatchMouseEvents() {
  const iframes = document.getElementsByTagName('iframe');
  const webviews = document.getElementsByTagName('webviews');
  for (const webview of webviews  as any) {
    webview.classList.remove('none-pointer-event');
  }
  for (const iframe of iframes  as any) {
    iframe.classList.remove('none-pointer-event');
  }
}

export const ResizeHandleHorizontal = (props: ResizeHandleProps) => {
  const ref = React.useRef<HTMLElement | null>();
  const resizing = React.useRef<boolean>(false);
  const startX = React.useRef<number>(0);
  const startPrevWidth = React.useRef<number>(0);
  const startNextWidth = React.useRef<number>(0);
  const prevElement = React.useRef<HTMLElement | null>();
  const nextElement = React.useRef<HTMLElement | null>();
  const requestFrame = React.useRef<number>();

  const setSize = (prev: number, next: number) => {
    const prevEle = props.findPrevElement ? props.findPrevElement() : prevElement.current!;
    const nextEle = props.findNextElement ? props.findNextElement() : nextElement.current!;
    if (nextEle) {
      nextEle.style.width = next * 100 + '%';
    }
    if (prevEle) {
      prevEle.style.width = prev * 100 + '%';
    }
    if (props.onResize && nextEle && prevEle) {
      props.onResize(prevEle, nextEle);
    }
  };

  const setAbsoluteSize = (size: number, isLatter?: boolean) => {
    const currentPrev = prevElement.current!.clientWidth;
    const currentNext = nextElement.current!.clientWidth;
    const totalSize = currentPrev + currentNext;
    const currentTotalWidth = +nextElement.current!.style.width!.replace('%', '') + +prevElement.current!.style.width!.replace('%', '');
    if (isLatter) {
      nextElement.current!.style.width = currentTotalWidth * (size / totalSize) + '%';
      prevElement.current!.style.width = currentTotalWidth * (1 - size / totalSize) + '%';
    } else {
      prevElement.current!.style.width = currentTotalWidth * (size / totalSize) + '%';
      nextElement.current!.style.width = currentTotalWidth * (1 - size / totalSize) + '%';
    }
    if (props.onResize) {
      props.onResize(prevElement.current!, nextElement.current!);
    }
  };

  const getAbsoluteSize = (isLatter?: boolean) => {
    if (isLatter) {
      return nextElement.current!.clientWidth;
    }
    return prevElement.current!.clientWidth;
  };

  const onMouseMove =  ((e) => {
    const prevWidth = startPrevWidth.current + e.pageX - startX.current;
    const nextWidth = startNextWidth.current - ( e.pageX - startX.current);
    const preserve = props.preserve || 0;
    if (requestFrame.current) {
      window.cancelAnimationFrame(requestFrame.current);
    }
    const parentWidth = ref.current!.parentElement!.offsetWidth;
    requestFrame.current = window.requestAnimationFrame(() => {
     setSize( (prevWidth / parentWidth), (nextWidth / parentWidth));
    });

  });
  const onMouseUp = ((e) => {
    resizing.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (props.onFinished) {
      props.onFinished();
    }
    allowWebviewCatchMouseEvents();
  });
  const onMouseDown =  ((e) => {
    resizing.current = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    startX.current = e.pageX;
    startPrevWidth.current = prevElement.current!.offsetWidth;
    startNextWidth.current = nextElement.current!.offsetWidth;
    preventWebviewCatchMouseEvents();
  });
  React.useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('mousedown', onMouseDown);
      prevElement.current = ref.current.previousSibling as HTMLElement;
      nextElement.current = ref.current.nextSibling as HTMLElement;
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('mousedown', onMouseDown);
        ref.current.removeEventListener('mousemove', onMouseMove);
        ref.current.removeEventListener('mouseup', onMouseUp);
      }
    };
  }, []);

  if (props.delegate) {
    props.delegate({
      setSize,
      setAbsoluteSize,
      getAbsoluteSize,
    });
  }

  return (
    <div ref={(e) => {ref.current = e; } } className={classnames({
      [styles['resize-handle-horizontal']]: true,
      [styles['with-color']]: !props.noColor,
    })}/>
  );
};

export const ResizeHandleVertical = (props: ResizeHandleProps) => {
  const ref = React.useRef<HTMLElement>();
  const resizing = React.useRef<boolean>(false);
  const startY = React.useRef<number>(0);
  const startHeight = React.useRef<number>(0);
  const startPrevHeight = React.useRef<number>(0);
  const startNextHeight = React.useRef<number>(0);
  const prevElement = React.useRef<HTMLElement>();
  const nextElement = React.useRef<HTMLElement>();

  const cachedPrevElement = React.useRef<HTMLElement>();
  const cachedNextElement = React.useRef<HTMLElement>();

  const requestFrame = React.useRef<number>();
  // direction: true为向下，false为向上
  const setSize = (prev: number, next: number, direction?: boolean) => {
      const prevEle = props.findPrevElement ? props.findPrevElement(direction) : prevElement.current!;
      const nextEle = props.findNextElement ? props.findNextElement(direction) : nextElement.current!;
      if (!nextEle || !prevEle) {
        return;
      }
      nextEle.style.height = next * 100 + '%';
      prevEle.style.height = prev * 100 + '%';
      if (props.onResize) {
        props.onResize(prevEle, nextEle);
      }
  };

  const setDomSize = (prev: number, next: number, prevEle: HTMLElement, nextEle: HTMLElement) => {
    nextEle.style.height = next * 100 + '%';
    prevEle.style.height = prev * 100 + '%';
    if (props.onResize && nextEle && prevEle) {
      props.onResize(prevEle, nextEle);
    }
  };

  // keep = true 左右侧面板使用，保证相邻节点的总宽度不变
  const setAbsoluteSize = (size: number, isLatter?: boolean, keep?: boolean) => {
    const currentPrev = prevElement.current!.clientHeight;
    const currentNext = nextElement.current!.clientHeight;
    const totalSize = currentPrev + currentNext;
    const currentTotalHeight = +nextElement.current!.style.height!.replace('%', '') + +prevElement.current!.style.height!.replace('%', '');
    if (isLatter) {
      nextElement.current!.style.height = currentTotalHeight * (size / totalSize) + '%';
      if (keep) {
        prevElement.current!.style.height = currentTotalHeight * (1 - size / totalSize) + '%';
      }
    } else {
      prevElement.current!.style.height = currentTotalHeight * (size / totalSize) + '%';
      if (keep) {
        nextElement.current!.style.height = currentTotalHeight * (1 - size / totalSize) + '%';
      }
    }
    if (props.onResize) {
      props.onResize(prevElement.current!, nextElement.current!);
    }
  };

  const getAbsoluteSize = (isLatter?: boolean) => {
    if (isLatter) {
      return nextElement.current!.clientHeight;
    }
    return prevElement.current!.clientHeight;
  };

  const onMouseDown = ((e) => {
    resizing.current = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    startY.current = e.pageY;
    cachedNextElement.current = nextElement.current;
    cachedPrevElement.current = prevElement.current;
    startPrevHeight.current = prevElement.current!.offsetHeight;
    startNextHeight.current = nextElement.current!.offsetHeight;
    preventWebviewCatchMouseEvents();
  });

  const onMouseMove = ((e) => {
    const direction = e.pageY > startY.current;
    // 若上层未传入findNextElement，dynamicNext为null，否则找不到符合要求的panel时返回undefined
    const dynamicNext = props.findNextElement ? props.findNextElement(direction) : null;
    const dynamicPrev = props.findPrevElement ? props.findPrevElement(direction) : null;
    // 作用元素变化重新初始化当前位置，传入findNextElement时默认已传入findPrevElement
    if (
      dynamicNext !== null && cachedNextElement.current !== dynamicNext ||
        dynamicPrev !== null && cachedPrevElement.current !== dynamicPrev
    ) {
      if (!dynamicNext || !dynamicPrev) {
        return;
      }
      cachedNextElement.current = dynamicNext!;
      cachedPrevElement.current = dynamicPrev!;
      startY.current = e.pageY;
      startPrevHeight.current = cachedPrevElement.current!.offsetHeight;
      startNextHeight.current = cachedNextElement.current!.offsetHeight;
    }

    const prevHeight = startPrevHeight.current + e.pageY - startY.current;
    const nextHeight = startNextHeight.current - ( e.pageY - startY.current);
    const preserve = props.preserve || 0;
    if (requestFrame.current) {
      window.cancelAnimationFrame(requestFrame.current);
    }
    const parentHeight = ref.current!.parentElement!.offsetHeight;
    requestFrame.current = window.requestAnimationFrame(() => {
      setDomSize(prevHeight / parentHeight, nextHeight / parentHeight, cachedPrevElement.current!, cachedNextElement.current!);
    });
  });

  const onMouseUp = ((e) => {
    resizing.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (props.onFinished) {
      props.onFinished();
    }
    allowWebviewCatchMouseEvents();
  });

  React.useEffect(() => {
    ref.current!.addEventListener('mousedown', onMouseDown);
    prevElement.current = ref.current!.previousSibling as HTMLElement;
    nextElement.current = ref.current!.nextSibling as HTMLElement;
    return () => {
      ref.current!.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (props.delegate) {
    props.delegate({
      setSize,
      setAbsoluteSize,
      getAbsoluteSize,
    });
  }

  return (<div ref={(e) => e && (ref.current = e) } className={classnames({
    [styles['resize-handle-vertical']]: true,
    [props.className || '']: true,
    [styles['with-color']]: !props.noColor,
  })}/>);

};
