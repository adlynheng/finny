// A React Native view that reports the mouse's position inside it, so charts
// can hover by shape (the sphere's arcs) or by position (the history chart's
// crosshair) on macOS (see src/components/ui/HoverSurface.macos.tsx).
//
// react-native-macos only emits mouse enter and leave, for a view's whole
// rectangle; it never forwards mouseMoved. This view tracks it itself.

#import <AppKit/AppKit.h>
#import <React/RCTComponent.h>
#import <React/RCTViewManager.h>

@interface FinnyHoverView : NSView
@property (nonatomic, copy) RCTDirectEventBlock onHoverMove;
@property (nonatomic, copy) RCTDirectEventBlock onHoverEnd;
@end

@implementation FinnyHoverView {
  NSTrackingArea *_trackingArea;
}

// Top-left origin, as React Native lays out.
- (BOOL)isFlipped
{
  return YES;
}

- (void)updateTrackingAreas
{
  if (_trackingArea) {
    [self removeTrackingArea:_trackingArea];
  }
  _trackingArea = [[NSTrackingArea alloc]
      initWithRect:NSZeroRect
           options:NSTrackingMouseMoved | NSTrackingMouseEnteredAndExited |
                   NSTrackingActiveInActiveApp | NSTrackingInVisibleRect
             owner:self
          userInfo:nil];
  [self addTrackingArea:_trackingArea];
  [super updateTrackingAreas];
}

- (void)sendMove:(NSEvent *)event
{
  if (!self.onHoverMove) {
    return;
  }
  NSPoint p = [self convertPoint:event.locationInWindow fromView:nil];
  NSSize size = self.bounds.size;
  self.onHoverMove(@{
    @"x" : @(p.x),
    @"y" : @(p.y),
    @"width" : @(size.width),
    @"height" : @(size.height),
  });
}

- (void)mouseEntered:(NSEvent *)event
{
  [self sendMove:event];
}

- (void)mouseMoved:(NSEvent *)event
{
  [self sendMove:event];
}

- (void)mouseExited:(NSEvent *)event
{
  if (self.onHoverEnd) {
    self.onHoverEnd(@{});
  }
}

// Hover only: clicks and scrolls go to whatever is underneath. The JS side
// must not pass pointerEvents, which RCTViewManager can only set on React
// Native's own views (it aborts on anything else).
- (NSView *)hitTest:(NSPoint)point
{
  return nil;
}

@end

@interface FinnyHoverViewManager : RCTViewManager
@end

@implementation FinnyHoverViewManager

RCT_EXPORT_MODULE(FinnyHoverView)

- (NSView *)view
{
  return [FinnyHoverView new];
}

RCT_EXPORT_VIEW_PROPERTY(onHoverMove, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHoverEnd, RCTDirectEventBlock)

@end
