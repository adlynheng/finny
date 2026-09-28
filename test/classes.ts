/** An element's NativeWind classes as a list (Jest leaves className a plain prop). */
export const classes = (el: { props: { className?: string } }) =>
  (el.props.className ?? '').split(/\s+/).filter(Boolean);
