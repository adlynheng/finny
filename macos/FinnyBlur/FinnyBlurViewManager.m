// A React Native view wrapping AppKit's NSVisualEffectView, so Glass can blur
// what sits behind it on macOS (see src/components/ui/Glass.macos.tsx).
//
// NSVisualEffectView blurs by material, not by radius: `material` picks one of
// AppKit's presets. It blends "within window", so it blurs the app's own views
// behind it rather than the desktop behind the window.

#import <AppKit/AppKit.h>
#import <React/RCTViewManager.h>

@interface FinnyBlurView : NSVisualEffectView
@end

@implementation FinnyBlurView

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.blendingMode = NSVisualEffectBlendingModeWithinWindow;
    // Blur even when the window is not key; the design never dims its glass.
    self.state = NSVisualEffectStateActive;
    self.material = NSVisualEffectMaterialPopover;
    // The design is light only.
    self.appearance = [NSAppearance appearanceNamed:NSAppearanceNameAqua];
  }
  return self;
}

// A backdrop never takes clicks: they go to whatever is under it. This is also
// why the JS side must not pass pointerEvents, which RCTViewManager can only set
// on React Native's own views (it aborts on anything else).
- (NSView *)hitTest:(NSPoint)point
{
  return nil;
}

@end

@interface FinnyBlurViewManager : RCTViewManager
@end

@implementation FinnyBlurViewManager

RCT_EXPORT_MODULE(FinnyBlurView)

- (NSView *)view
{
  return [FinnyBlurView new];
}

RCT_CUSTOM_VIEW_PROPERTY(material, NSString, FinnyBlurView)
{
  static NSDictionary<NSString *, NSNumber *> *materials;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    materials = @{
      @"titlebar" : @(NSVisualEffectMaterialTitlebar),
      @"selection" : @(NSVisualEffectMaterialSelection),
      @"menu" : @(NSVisualEffectMaterialMenu),
      @"popover" : @(NSVisualEffectMaterialPopover),
      @"sidebar" : @(NSVisualEffectMaterialSidebar),
      @"headerView" : @(NSVisualEffectMaterialHeaderView),
      @"sheet" : @(NSVisualEffectMaterialSheet),
      @"windowBackground" : @(NSVisualEffectMaterialWindowBackground),
      @"hudWindow" : @(NSVisualEffectMaterialHUDWindow),
      @"fullScreenUI" : @(NSVisualEffectMaterialFullScreenUI),
      @"toolTip" : @(NSVisualEffectMaterialToolTip),
      @"contentBackground" : @(NSVisualEffectMaterialContentBackground),
      @"underWindowBackground" : @(NSVisualEffectMaterialUnderWindowBackground),
      @"underPageBackground" : @(NSVisualEffectMaterialUnderPageBackground),
    };
  });
  NSNumber *material = json ? materials[json] : nil;
  view.material = material ? material.integerValue : NSVisualEffectMaterialPopover;
}

// "light" (the default) or "dark": the material's tint. A dark scrim needs the
// dark one, or the light material's white wash cancels its ink.
RCT_CUSTOM_VIEW_PROPERTY(appearance, NSString, FinnyBlurView)
{
  view.appearance = [NSAppearance
      appearanceNamed:[json isEqualToString:@"dark"] ? NSAppearanceNameDarkAqua : NSAppearanceNameAqua];
}

@end
