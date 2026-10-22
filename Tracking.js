// Server component: injects dataLayer + analytics/pixel scripts based on admin settings.
const ok = (v, re) => (typeof v === 'string' && re.test(v.trim()) ? v.trim() : '');

export default function Tracking({ tracking = {} }) {
  const gtm = ok(tracking.gtmId, /^GTM-[A-Z0-9]{4,12}$/);
  const domain = ok(tracking.gtmDomain, /^[a-z0-9.-]+\.[a-z]{2,}$/i) || 'www.googletagmanager.com';
  const ga4 = ok(tracking.ga4Id, /^G-[A-Z0-9]{6,14}$/);
  const fb = ok(tracking.fbPixelId, /^\d{8,20}$/);
  const tt = ok(tracking.tiktokPixelId, /^[A-Z0-9]{8,30}$/);
  let code = 'window.dataLayer=window.dataLayer||[];';
  if (gtm) {
    code += `window.__gtm=1;(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://${domain}/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`;
  } else {
    if (ga4) code += `window.gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${ga4}');(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${ga4}';document.head.appendChild(s)})();`;
    if (fb) code += `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb}');fbq('track','PageView');`;
    if (tt) code += `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=n,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]={};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tt}');ttq.page()}(window,document,'ttq');`;
  }
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: code }} />
      {gtm && <noscript><iframe src={`https://${domain}/ns.html?id=${gtm}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>}
    </>
  );
}
