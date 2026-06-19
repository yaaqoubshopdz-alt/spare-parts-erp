import{c as Gt,j as e,F as kt,q as Ht,k as St,Z as Ft,G as It,A as Xt,m as Nt}from"./index-i5pinV97.js";import{a as _t}from"./printer-C2ol_a6j.js";/**
 * @license lucide-react v0.303.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oe=Gt("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.303.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=Gt("MapPin",[["path",{d:"M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",key:"2oe9fu"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]),zt=o=>{if(!o)return!0;const t=o.trim().toLowerCase();return t===""||t==="عام"||t==="زبون عام"||t==="زبون"||t==="client"||t==="general"||t==="walk-in"||t==="walk-in customer"||t==="client passager"||t==="passager"||t.includes("passager")||t.includes("زبون عام")},j=(o,t)=>t?t[o]!=="false"&&t[o]!==!1:!0,Ut=(o,t,a,i,r)=>{if(t==="80mm")return[o||[]];if(!o||o.length===0)return[[]];const W=(a==null?void 0:a.itemsPerPage)!==void 0?a.itemsPerPage:0,S=parseInt(i==null?void 0:i.items_per_page_a4,10)||0,J=parseInt(i==null?void 0:i.items_per_page_a5,10)||0,q=t==="A4"?S:t==="A5"?J:0,F=W>0?W:q;if(F>0){const m=[];let p=0;for(;p<o.length;)m.push(o.slice(p,p+F)),p+=F;return m}if(!a||!i||!r){const m=[],p=t==="A4"?6:4;if(o.length<=p)return[o];const b=t==="A4"?6:4,d=t==="A4"?14:10,f=t==="A4"?10:8;let h=0,l=1;for(;h<o.length;){let u=0;const x=o.length-h;l===1?u=b:x<=f?u=x:x<=d?u=f:u=d;const it=o.slice(h,h+u);m.push(it),h+=u,l++}return m}const B=t==="A5"?194:277,K=m=>m*.2646,at=()=>{if(!a.showCompanyBlock&&!a.showInvoiceDetails)return 0;const m=t==="A5"?.72:1,b=parseInt((i==null?void 0:i.logo_size)||"80",10)*m,d=K(b),f=!!(i!=null&&i.store_logo)&&a.showCompanyBlock;let h=0;if(a.showCompanyBlock){let x=5;i!=null&&i.company_name&&(x+=8),i!=null&&i.company_activity&&(i==null?void 0:i.company_activity)!=="false"&&(x+=5),i!=null&&i.company_phone&&(x+=5),i!=null&&i.company_address&&(x+=5),((i==null?void 0:i.logo_position)||"right")==="center"&&f?h=d+x+5:f?h=Math.max(d,x):h=x}let l=0;return a.showInvoiceDetails&&(l=26),Math.max(h,l)+8},Y=()=>{const m=zt(r.customer_name);return!a.showCustomerBlock||m?0:11},k=()=>{const m=(i==null?void 0:i.company_rc)&&j("company_rc_enabled",i),p=(i==null?void 0:i.company_nif)&&j("company_nif_enabled",i),b=(i==null?void 0:i.company_nis)&&j("company_nis_enabled",i),d=(i==null?void 0:i.company_art)&&j("company_art_enabled",i),f=(i==null?void 0:i.company_cb)&&j("company_cb_enabled",i);return a.showCompanyOfficialDetails&&(m||p||b||d||f)?13:0},V=()=>{if((a==null?void 0:a.compactFooter)||r.items&&r.items.length>17){let l=8;const u=a.notesText!==void 0&&a.notesText!==""?a.notesText:r.notes;return a.showNotes&&u&&String(u).trim()!==""&&(l+=8),l}let p=0;if(!!a.showQuotationMode)p=10;else{const l=r.global_discount_amount>0,u=r.tax_amount>0;let x=4;l&&(x+=1),u&&(x+=1),p=3+x*6.5}let d=0;const f=a.notesText!==void 0&&a.notesText!==""?a.notesText:r.notes;if(a.showNotes&&f&&String(f).trim()!==""){const l=String(f),u=(l.match(/\n/g)||[]).length,x=l.length;d=10+Math.max(1,u+Math.ceil(x/45))*5,d=Math.max(25,d)}return Math.max(p,d)+5},rt=()=>a.showFooter?15:0,g=m=>{const p=m.product_name_fr||m.product_name_snapshot||"",b=m.product_name||"",d=b&&b.trim()!==""&&b!==p,f=p.length;let l=6+Math.max(1,Math.ceil(f/30))*4.5;return d&&(l+=4),l},A=at(),Z=Y(),N=k(),T=8,D=V(),R=rt(),nt=(m,p)=>{let b=0;for(;b<m.length;){let d=0+T+D+R;for(let l=b;l<m.length;l++)d+=g(m[l]);if(d<=B)return!0;let f=0+T,h=0;for(;b<m.length;){const l=g(m[b]);if(h>0&&f+l>B)break;f+=l,b++,h++}if(h===0)return!1}return!0};let L=A+Z+N+T+D+R;for(const m of o)L+=g(m);if(L<=B)return[o];const tt=[];let y=0,w=1;for(;y<o.length;){const p=(w===1?A+Z+N:0)+T;let b=p+D+R;for(let l=y;l<o.length;l++)b+=g(o[l]);if(b<=B){tt.push(o.slice(y));break}let d=0,f=p;for(;y+d<o.length;){const l=g(o[y+d]);if(d>0&&f+l>B)break;f+=l,d++}o.length-y>1&&d>=o.length-y&&(d=o.length-y-1),d===0&&(d=1);let h=1;for(let l=d;l>=1;l--)if(nt(o.slice(y+l))){h=l;break}tt.push(o.slice(y,y+h)),y+=h,w++}return tt},ae={receipt:{size:"80mm",columns:["index","name","quantity","price","total"],config:{showCompanyBlock:!0,showCompanyOfficialDetails:!1,showCustomerBlock:!1,showInvoiceDetails:!0,showNotes:!0,notesText:"",showFooter:!0,fontWeight:"bold",fontWeightPercent:80,showColBarcode:!1,showColName:!0,showColQty:!0,showColUnit:!1,showColDiscount:!1,showColPrice:!0,showColTotal:!0,itemsPerPage:0,compactFooter:!1}},customer:{size:"A4",columns:["index","barcode","name","quantity","price","total"],config:{showCompanyBlock:!0,showCompanyOfficialDetails:!1,showCustomerBlock:!0,showInvoiceDetails:!0,showNotes:!0,notesText:"",showFooter:!0,fontWeight:"bold",fontWeightPercent:80,showColBarcode:!0,showColName:!0,showColQty:!0,showColUnit:!1,showColDiscount:!1,showColPrice:!0,showColTotal:!0,itemsPerPage:0,compactFooter:!1}},tax:{size:"A4",columns:["index","barcode","name","quantity","unit","price","discount","total"],config:{showCompanyBlock:!0,showCompanyOfficialDetails:!0,showCustomerBlock:!0,showInvoiceDetails:!0,showNotes:!0,notesText:"",showFooter:!0,fontWeight:"bold",fontWeightPercent:80,showColBarcode:!0,showColName:!0,showColQty:!0,showColUnit:!0,showColDiscount:!0,showColPrice:!0,showColTotal:!0,itemsPerPage:0,compactFooter:!1}},custom:{size:"A4",columns:["index","barcode","name","quantity","price","total"],config:{showCompanyBlock:!0,showCompanyOfficialDetails:!0,showCustomerBlock:!0,showInvoiceDetails:!0,showNotes:!0,notesText:"",showFooter:!0,fontWeight:"bold",fontWeightPercent:80,showColBarcode:!0,showColName:!0,showColQty:!0,showColUnit:!1,showColDiscount:!1,showColPrice:!0,showColTotal:!0,itemsPerPage:0,compactFooter:!1}}},Wt={index:"#",barcode:"الكود",name:"المنتج/الوصف",quantity:"الكمية",unit:"الوحدة",discount:"الخصم",price:"السعر",total:"الإجمالي"},Rt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',Qt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',Jt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',Kt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',Zt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',jt='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',Ot='<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-left: 4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',ft=o=>o?o.trim().toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^a-z0-9\u0621-\u064A]/gi,""):"";function re(o,t,a,i,r,W){if(!o)return"";const S=W.filter(n=>n==="index"?!0:n==="barcode"?r.showColBarcode:n==="name"?r.showColName:n==="quantity"?r.showColQty:n==="unit"?r.showColUnit:n==="price"?r.showColPrice:n==="discount"?r.showColDiscount:n==="total"?r.showColTotal:!1),J=n=>n==="index"?"width: 5%; text-align: center;":n==="barcode"?"width: 14%; text-align: center;":n==="name"?"width: 44%; text-align: right;":n==="quantity"?"width: 9%; text-align: center;":n==="unit"?"width: 7%; text-align: center;":n==="price"?"width: 11%; text-align: center;":n==="discount"?"width: 8%; text-align: center;":n==="total"?"width: 13%; text-align: left; font-weight: var(--font-weight-bold);":"",q=r.fontWeightPercent!==void 0?r.fontWeightPercent:80,F=400+Math.round((q-50)*10),B=String(Math.max(400,Math.min(900,F))),K=String(Math.max(600,Math.min(900,F+200))),at=`
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; }
    @page {
      margin: 0 !important;
    }
    html, body {
      width: ${a==="80mm"?"80mm":a==="A5"?"148mm":"210mm"} !important;
      max-width: ${a==="80mm"?"80mm":a==="A5"?"148mm":"210mm"} !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      overflow: visible !important;
    }

    @media print {
      .items-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .totals-and-notes {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .metadata-card, .info-section, .legal-grid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
    
    .invoice-container {
      margin: 0 auto;
      background: #ffffff !important;
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', Arial, sans-serif;
      direction: rtl;
      color: #1e293b !important;
      line-height: 1.4;
      --font-weight-base: 500;
      --font-weight-bold: 800;
    }

    .invoice-container {
      background-color: #ffffff !important;
      color: #1e293b !important;
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', Arial, sans-serif !important;
      font-weight: var(--font-weight-base);
    }

    /* High readability local font for all numbers, tables, and official card values */
    .items-table,
    .totals-table,
    .metadata-card,
    .meta-val,
    .legal-box,
    .info-section {
      font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
    }

    /* Custom range slider font weight thickness applies SPECIFICALLY to table body cells (td) as requested */
    .items-table td,
    .totals-table td {
      font-weight: ${B} !important;
    }

    .items-table td .product-title-main {
      font-weight: var(--font-weight-bold) !important;
    }

    .totals-table tr.remaining-bar td {
      font-weight: ${K} !important;
    }

    .invoice-container td,
    .invoice-container th,
    .invoice-container p,
    .invoice-container div,
    .invoice-container span,
    .invoice-container table {
      border-color: #cbd5e1;
    }

    .invoice-container strong,
    .invoice-container th,
    .invoice-container th *,
    .invoice-container b,
    .invoice-container .font-bold {
      font-weight: var(--font-weight-bold) !important;
    }
    
    .size-A4 {
      width: 210mm;
      padding: 0;
      font-size: 13px;
    }

    .size-A5 {
      width: 148mm;
      padding: 0;
      font-size: 9.2px;
    }

    .size-80mm {
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 0;
      font-size: 12px;
      font-weight: bold !important;
    }

    /* High-contrast Monochrome Printing Optimization for 80mm Thermal Paper */
    .size-80mm,
    .size-80mm * {
      color: #000000 !important;
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: none !important;
      font-smoothing: none !important;
      text-rendering: optimizeSpeed !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    .size-80mm table,
    .size-80mm th,
    .size-80mm td,
    .size-80mm div,
    .size-80mm span,
    .size-80mm hr {
      border-color: #000000 !important;
    }

    .print-page {
      position: relative;
      width: 100%;
      height: ${a==="80mm"?"auto":a==="A5"?"210mm":"297mm"};
      ${a!=="80mm"?`max-height: ${a==="A5"?"210mm":"297mm"} !important; overflow: hidden !important;`:""}
      box-sizing: border-box;
      padding: ${a==="80mm"?"5mm 4.5mm":a==="A5"?"8mm 6mm":"10mm 8mm"};
      background-color: #ffffff !important;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      ${a!=="80mm"?"border-top: 5px solid #3b82f6 !important;":""}
    }
    .print-page:last-child {
      page-break-after: avoid;
    }
    .page-content-top {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      width: 100%;
    }
    .page-content-bottom {
      width: 100%;
      margin-top: auto;
    }
    
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.2em;
    }

    .header-logo {
      height: 5.5em;
      width: 5.5em;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #cbd5e1 !important;
    }

    .logo-container {
      display: inline-block;
    }

    .shop-title {
      font-size: 2.2em;
      font-weight: 900 !important;
      color: #0f172a !important;
      margin: 0;
      line-height: 1.1;
    }

    .shop-subtitle {
      font-size: 1em;
      color: #3b82f6 !important;
      margin-top: 0.2em;
      margin-bottom: 0.4em;
      font-weight: var(--font-weight-bold) !important;
    }

    .size-80mm .shop-title {
      font-size: 1.4em;
      text-align: center;
    }

    .size-80mm .logo-container {
      text-align: center;
    }

    .metadata-card {
      border: 1px solid #cbd5e1 !important;
      border-top: 3px solid #3b82f6 !important;
      background-color: #ffffff !important;
      border-radius: 0.8em;
      padding: 0 !important;
      width: 100%;
      max-width: 18em;
      display: inline-block;
      overflow: hidden;
    }

    .size-80mm .metadata-card,
    .size-A5 .metadata-card {
      max-width: 100% !important;
      width: 100% !important;
      display: block !important;
    }

    .metadata-card * {
      background-color: #ffffff !important;
    }

    .meta-row {
      border-bottom: 1px solid #e2e8f0;
    }
    .meta-row:last-child {
      border-bottom: none;
    }

    .meta-val {
      font-family: 'Cairo', Arial, sans-serif;
    }

    .info-section {
      background-color: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em;
      padding: 0.7em 1.2em;
      margin-bottom: 1.2em;
      width: 100%;
    }

    .info-section * {
      background-color: #ffffff !important;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em;
      overflow: hidden;
      margin-bottom: 1.2em;
    }

    .items-table th {
      background-color: #f8fafc !important;
      color: #0f172a !important;
      border-bottom: 4px double #3b82f6 !important;
      border-left: 1px solid #cbd5e1 !important;
      padding: 0.75em 0.65em !important;
      font-size: 0.95em;
    }
    
    .items-table th:last-child {
      border-left: none !important;
    }
    
    .items-table th * {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
    }

    .items-table td {
      border-bottom: 1px solid #e2e8f0 !important;
      border-left: 1px solid #cbd5e1 !important;
      padding: 0.55em 0.6em;
      vertical-align: middle;
    }
    
    .items-table td:last-child {
      border-left: none !important;
    }
    
    .items-table tr:last-child td {
      border-bottom: none !important;
    }

    .items-table tr {
      background-color: #ffffff !important;
    }

    .items-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    .size-80mm .items-table {
      border-radius: 0.4em;
    }

    .size-80mm .items-table th {
      padding: 0.35em 0.1em;
      font-size: 0.8em;
      background-color: transparent !important;
      color: #1e293b !important;
      border-bottom: 1px dashed #000 !important;
      border-left: none !important;
    }
    
    .size-80mm .items-table th * {
      background-color: transparent !important;
      color: #1e293b !important;
    }

    .size-80mm .items-table td {
      padding: 0.5em 0.1em;
      font-size: 0.85em;
      border-bottom: 1px dashed #eee !important;
      border-left: none !important;
    }

    /* Side-by-side notes and totals layout */
    .totals-and-notes {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5em;
      margin-top: 0.8em;
      width: 100%;
    }

    .totals-and-notes .notes-block {
      flex: 1;
      min-width: 0;
    }

    .totals-and-notes .totals-block {
      width: 22em;
      flex-shrink: 0;
      margin-right: auto !important;
    }

    .size-80mm .totals-and-notes {
      display: block;
    }

    .size-80mm .totals-and-notes .totals-block {
      width: 100%;
      margin-right: 0 !important;
    }

    .totals-table {
      width: 100%;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 0.8em !important;
      overflow: hidden !important;
    }

    /* Crisp grid borders for the totals table */
    .totals-table td {
      padding: 0.6em 0.8em;
      font-size: 0.95em;
      background-color: #ffffff !important;
      border-bottom: 1px solid #cbd5e1 !important;
      border-left: 1px solid #cbd5e1 !important;
    }

    .totals-table td:last-child {
      border-left: none !important;
    }

    .totals-table tr:last-child td {
      border-bottom: none !important;
    }

    /* Clean high-contrast row for final total remaining (SPECIFICITY RESISTANT) */
    .invoice-container tr.remaining-bar,
    .invoice-container tr.remaining-bar td {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 4px double #0f172a !important;
      border-left: none !important;
    }

    .size-80mm .totals-table tr.grand-total td {
      font-size: 1.1em;
    }

    /* Dashed horizontal divider for footer as requested */
    .invoice-footer {
      margin-top: 2em;
      border-top: 2px dashed #94a3b8 !important;
      padding-top: 1em;
      text-align: center;
      color: #64748b !important;
      font-size: 0.85em;
    }

    .size-80mm .invoice-footer {
      border-top: 2px dashed #94a3b8 !important;
      margin-top: 1.2em;
      padding-top: 0.6em;
      font-size: 0.8em;
    }

    /* Monochrome and Bold Overrides for Thermal Print */
    .size-80mm,
    .size-80mm * {
      color: #000000 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      font-weight: bold !important; /* Force thick text to prevent thermal fade/erosion */
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: none !important;
      font-smoothing: none !important;
      text-rendering: optimizeSpeed !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }

    .size-80mm table,
    .size-80mm th,
    .size-80mm td,
    .size-80mm div,
    .size-80mm span,
    .size-80mm hr {
      border-color: #000000 !important;
    }



    .size-80mm table.items-table th {
      border-bottom: 2px solid #000000 !important;
      border-top: 1px solid #000000 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      padding: 0.35em 0.1em !important;
      font-size: 0.85em !important;
    }

    /* Vertical Stacking of Customer & Phone Info for Roll paper */
    .size-80mm .info-section {
      padding: 0.4em !important;
      margin-bottom: 0.8em !important;
      border: 1px solid #000000 !important;
    }
    .size-80mm .info-table,
    .size-80mm .info-section table,
    .size-80mm .info-section tbody,
    .size-80mm .info-section tr {
      display: block !important;
      width: 100% !important;
    }
    .size-80mm .info-table td,
    .size-80mm .info-section td {
      display: block !important;
      width: 100% !important;
      text-align: right !important;
      padding: 0.3em 0 !important;
      border: none !important;
      direction: rtl !important;
    }
    .size-80mm .info-table td strong,
    .size-80mm .info-section td strong {
      font-size: 0.95em !important;
      font-weight: bold !important;
      display: inline-block !important;
      flex-shrink: 0 !important;
      min-width: 4.5em !important;
      color: #000000 !important;
    }
    .size-80mm .info-table td span,
    .size-80mm .info-section td span {
      font-size: 1em !important;
      font-weight: bold !important;
      margin-right: 0.4em !important;
      color: #000000 !important;
      display: inline-block !important;
    }
    /* React layout specific handles for inner flex components inside td */
    .size-80mm .info-section td span.flex {
      display: flex !important;
      justify-content: flex-start !important;
      width: 100% !important;
      direction: rtl !important;
    }
  `,Y=!!r.showQuotationMode,k=n=>`${(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} د.ج`,V=n=>(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),rt=parseInt((t==null?void 0:t.logo_size)||"80",10),g=a==="A5"?.72:a==="80mm"?.65:1,A=`${Math.round(rt*g)}px`,Z=(t==null?void 0:t.logo_shape)||"circle",N=Z==="circle"?"50%":"12px",T=parseFloat((t==null?void 0:t.logo_opacity)||"100"),D=String(T/100),nt=(t==null?void 0:t.logo_grayscale)==="true"?"grayscale(100%)":"none",L=(t==null?void 0:t.logo_position)||"right",tt=parseInt((t==null?void 0:t.logo_x)||"0",10),y=parseInt((t==null?void 0:t.logo_y)||"0",10),w=Math.round(tt*g),m=Math.round(y*g),p=tt!==0||y!==0;let b=`width: ${A}; height: ${A}; opacity: ${D}; filter: ${nt}; border-radius: ${N}; overflow: hidden; display: inline-block; transition: transform 0.1s ease;`;if(p){const n=L==="center"?`transform: translate(-50%, 0) translate(${w}px, ${m}px);`:`transform: translate(${w}px, ${m}px);`;b+=` position: absolute !important; z-index: 50; ${L==="right"?"right: 1.5em; top: 1em;":L==="left"?"left: 1.5em; top: 1em;":"left: 50%; top: 1em;"} ${n}`}else b+=` transform: translate(${w}px, ${m}px);`;const d=t!=null&&t.store_logo?`<div class="logo-container" style="${b}">
        <img class="header-logo" src="${t.store_logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${N};" />
       </div>`:"",f=d&&!p?d:"",h=d&&p?d:"",l=(t==null?void 0:t.secondary_logo)||"",u=parseInt((t==null?void 0:t.secondary_logo_size)||"80",10),x=`${Math.round(u*g)}px`,mt=((t==null?void 0:t.secondary_logo_shape)||"circle")==="circle"?"50%":"12px",bt=parseFloat((t==null?void 0:t.secondary_logo_opacity)||"100"),xt=String(bt/100),wt=(t==null?void 0:t.secondary_logo_grayscale)==="true"?"grayscale(100%)":"none",yt=parseInt((t==null?void 0:t.secondary_logo_x)||"0",10),P=parseInt((t==null?void 0:t.secondary_logo_y)||"0",10),lt=Math.round(yt*g),ut=Math.round(P*g),st=`position: absolute; z-index: 50; width: ${x}; height: ${x}; opacity: ${xt}; filter: ${wt}; border-radius: ${mt}; overflow: hidden; transform: translate(${lt}px, ${ut}px); transition: transform 0.1s ease; left: 1.5em; top: 1em; pointer-events: none;`,ct=(t==null?void 0:t.company_rc)&&j("company_rc_enabled",t),pt=(t==null?void 0:t.company_nif)&&j("company_nif_enabled",t),I=(t==null?void 0:t.company_nis)&&j("company_nis_enabled",t),c=(t==null?void 0:t.company_art)&&j("company_art_enabled",t),H=(t==null?void 0:t.company_cb)&&j("company_cb_enabled",t);let X="";if(r.showCompanyOfficialDetails&&(ct||pt||I||c||H)){const n=[];ct&&n.push({label:"سجل تجاري (RC)",val:t.company_rc}),pt&&n.push({label:"رقم جبائي (NIF)",val:t.company_nif}),I&&n.push({label:"رقم إحصائي (NIS)",val:t.company_nis}),c&&n.push({label:"رقم المادة (Art)",val:t.company_art}),H&&n.push({label:"الحساب البنكي (CB)",val:t.company_cb}),X+=`
      <div style="margin-bottom: 1.2em; border: 1px solid #cbd5e1 !important; border-radius: 0.8em; overflow: hidden; background-color: #ffffff !important;" dir="rtl">
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1 !important;">
              ${n.map((C,Q)=>`
                <th style="padding: 0.5em 0.7em; font-weight: bold; ${Q<n.length-1?"border-left: 1px solid #cbd5e1 !important;":""} color: #0f172a !important; background-color: #f1f5f9 !important; text-align: center;">
                  ${C.label}
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${n.map((C,Q)=>`
                <td class="meta-val" style="padding: 0.6em 0.7em; font-weight: bold; ${Q<n.length-1?"border-left: 1px solid #cbd5e1 !important;":""} color: #1e293b !important; font-family: monospace; text-align: center;">
                  ${C.val}
                </td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    `}let O="";r.showCompanyBlock&&(L==="center"?O+=`
        <div style="width: 100%; text-align: center; margin-bottom: 0.6em; direction: rtl;">
          ${f?`<div style="margin-bottom: 0.8em; display: flex; justify-content: center; width: 100%;">${f}</div>`:""}
          <div style="width: 100%;">
            ${t!=null&&t.company_name?`<div class="shop-title" style="text-align: center !important; margin: 0 auto !important;">${t.company_name}</div>`:""}
            <div class="shop-subtitle" style="text-align: center !important; margin-top: 0.2em !important; margin-bottom: 0.4em !important; font-weight: var(--font-weight-bold) !important;">${t!=null&&t.company_activity&&(t==null?void 0:t.company_activity)!=="false"?t.company_activity:"قطع غيار السيارات والزيوت والإطارات"}</div>
            ${t!=null&&t.company_phone?`
              <div class="meta-item" style="font-size: 0.95em; margin-bottom: 0.25em; text-align: center !important; display: flex; align-items: center; justify-content: center; gap: 0.4em; direction: rtl;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0;">${jt} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold);">${t.company_phone}</span>
              </div>
            `:""}
            ${t!=null&&t.company_address?`<div class="meta-item" style="font-size: 0.95em; color: #475569; text-align: center !important; display: flex; align-items: center; justify-content: center; gap: 0.3em;">${Ot} العنوان: ${t.company_address}</div>`:""}
          </div>
        </div>
      `:O+=`
        <div style="width: 100%; text-align: right; min-height: ${A}; direction: rtl;">
          ${f?`
            <div class="logo-container" style="float: ${L==="left"?"left":"right"}; shape-outside: ${Z==="circle"?"circle(50%)":"none"}; shape-margin: 12px; margin: ${L==="left"?"0 15px 10px 0":"0 0 10px 15px"}; width: ${A}; height: ${A}; opacity: ${D}; filter: ${nt}; border-radius: ${N}; overflow: hidden;">
              <img class="header-logo" src="${t.store_logo}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${N};" />
            </div>
          `:""}
          <div class="company-text-content" style="${L!=="right"?"border-right: 4px solid #3b82f6; padding-right: 12px;":""}">
            ${t!=null&&t.company_name?`<h1 class="shop-title" style="margin: 0; line-height: 1.2;">${t.company_name}</h1>`:""}
            <div class="shop-subtitle" style="margin-top: 0.2em; margin-bottom: 0.4em; font-weight: var(--font-weight-bold);">${t!=null&&t.company_activity&&(t==null?void 0:t.company_activity)!=="false"?t.company_activity:"قطع غيار السيارات والزيوت والإطارات"}</div>
            ${t!=null&&t.company_phone?`
              <div style="display: flex; align-items: center; justify-content: flex-start; gap: 0.4em; direction: rtl; margin-bottom: 0.25em;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0; color: #1e293b;">${jt} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold);">${t.company_phone}</span>
              </div>
            `:""}
            ${t!=null&&t.company_address?`
              <p style="margin: 0; font-size: 0.95em; color: #475569; text-align: right;">
                <span style="display: inline-block; vertical-align: middle;">${t.company_address}</span>
                <span style="display: inline-block; vertical-align: middle; margin-right: 4px; color: #94a3b8;">${Ot}</span>
                <span style="display: inline-block; vertical-align: middle; margin-right: 4px;">العنوان:</span>
              </p>
            `:""}
          </div>
        </div>
      `);let et="";const s=zt(o.customer_name);r.showCustomerBlock&&!s&&(et+=`
      <div class="info-section" style="border: 1px solid #cbd5e1 !important;">
        <table class="info-table">
          <tr>
            <td style="border: none !important; text-align: right; padding: 0.2em 0.5em; vertical-align: middle; width: 55%;">
              <strong style="font-size: 0.9em; vertical-align: middle; display: inline-block; flex-shrink: 0;">${Zt} العميل:</strong>
              <span style="font-weight: var(--font-weight-bold); font-size: 1.1em; margin-right: 0.4em; vertical-align: middle;">${o.customer_name}</span>
            </td>
            <td style="border: none !important; padding: 0.2em 0.5em; vertical-align: middle; width: 45%;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4em; direction: rtl;">
                <strong style="display: flex; align-items: center; gap: 0.2em; flex-shrink: 0; font-size: 0.9em;">${jt} الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed; font-weight: var(--font-weight-bold); font-size: 1.1em;">${o.customer_phone||"—"}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `);let _="<tr>";S.forEach(n=>{_+=`<th style="${J(n)}">${Wt[n]}</th>`}),_+="</tr>";let z="";if(Y)z+=`
      <tr class="remaining-bar">
        <td style="border-top-right-radius: 0.6em; border-bottom-right-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">الإجمالي التقديري:</td>
        <td style="text-align: left; border-top-left-radius: 0.6em; border-bottom-left-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">${k(o.total)}</td>
      </tr>
    `;else{const n=o.global_discount_amount>0,C=o.tax_amount>0;n&&(z+=`
        <tr>
          <td style="color: #ef4444; font-weight: var(--font-weight-bold);">الخصم:</td>
          <td style="text-align: left; color: #ef4444; font-weight: var(--font-weight-bold);">${k(o.global_discount_amount)}</td>
        </tr>
      `),C&&(z+=`
        <tr>
          <td style="color: #475569; font-weight: var(--font-weight-bold);">الضريبة (${o.tax_percent}%):</td>
          <td style="text-align: left; font-weight: var(--font-weight-bold);">${k(o.tax_amount)}</td>
        </tr>
      `),z+=`
      <tr>
        <td style="color: #10b981; font-size: 0.9em; font-weight: var(--font-weight-bold);">المدفوع:</td>
        <td style="text-align: left; font-size: 0.9em; color: #10b981; font-weight: var(--font-weight-bold);">${k(o.paid)}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">المبلغ المتبقي:</td>
        <td style="text-align: left; font-size: 0.9em; font-weight: var(--font-weight-bold);">${k(o.remaining)}</td>
      </tr>
      <tr class="remaining-bar">
        <td style="border-top-right-radius: 0.6em; border-bottom-right-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">المجموع الإجمالي:</td>
        <td style="text-align: left; border-top-left-radius: 0.6em; border-bottom-left-radius: 0.6em; padding: 0.6em 0.8em; font-weight: var(--font-weight-bold);">${k(o.total)}</td>
      </tr>
    `}const v=r.notesText!==void 0&&r.notesText!==""?r.notesText:o.notes,$=r.showNotes&&v&&String(v).trim()!=="";let ot="";$&&(ot+=`
      <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.8em; padding: 0.8em 1.1em; background-color: #ffffff !important; height: 100%; min-height: 8em; display: flex; flex-direction: column;">
        <div style="font-weight: var(--font-weight-bold); font-size: 1.05em; color: #0f172a !important; border-bottom: 1px solid #e2e8f0 !important; padding-bottom: 0.3em; margin-bottom: 0.4em; display: flex; align-items: center; gap: 0.3em;">
          ${Rt}
          <span>ملاحظة:</span>
        </div>
        <div style="font-size: 0.95em; color: #334155 !important; line-height: 1.5; white-space: pre-wrap;">${v}</div>
      </div>
    `);let E="";if(r.compactFooter||o.items&&o.items.length>17){const n=o.global_discount_amount>0,C=o.tax_amount>0;E=`
      <div style="width: 100%; display: flex; flex-direction: column; gap: 5px; margin-top: 0.5em; font-family: 'Tahoma', sans-serif !important;">
        ${$?`
          <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.5em; padding: 0.4em 0.8em; background-color: #ffffff !important; font-size: 10.5px; text-align: right; color: #334155 !important;">
            <strong>ملاحظة:</strong> ${v}
          </div>
        `:""}
        
        <div style="border: 1px solid #cbd5e1 !important; border-radius: 0.5em; padding: 0.45em 0.8em; background-color: #f8fafc !important; font-size: 10.5px; width: 100%; direction: rtl; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;">
          ${n?`<div style="white-space: nowrap;"><strong style="color: #ef4444;">الخصم:</strong> <span class="meta-val" style="color: #ef4444;">${k(o.global_discount_amount)}</span></div>`:""}
          ${C?`<div style="white-space: nowrap;"><strong>الضريبة (${o.tax_percent}%):</strong> <span class="meta-val">${k(o.tax_amount)}</span></div>`:""}
          <div style="white-space: nowrap;"><strong style="color: #10b981;">المدفوع:</strong> <span class="meta-val" style="color: #10b981;">${k(o.paid)}</span></div>
          <div style="white-space: nowrap;"><strong>المتبقي:</strong> <span class="meta-val">${k(o.remaining)}</span></div>
          <div style="background-color: #f1f5f9 !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; padding: 0.25em 0.7em; border-radius: 0.35em; white-space: nowrap;">
            <strong>${Y?"الإجمالي التقديري":"المجموع الإجمالي"}:</strong> <span class="meta-val" style="font-weight: bold; color: #0f172a !important;">${k(o.total)}</span>
          </div>
        </div>
      </div>
    `}else E=`
      <div class="totals-and-notes">
        <div class="notes-block">
          ${ot}
        </div>
        <div class="totals-block">
          <table class="totals-table">
            ${z}
          </table>
        </div>
      </div>
    `;let Mt="";if(r.showFooter){const n=Y?"عرض السعر هذا صالح لمدة 15 يوماً من تاريخ الإصدار. نشكركم على اهتمامكم بخدماتنا.":(t==null?void 0:t.receipt_footer)||"شكراً لزيارتكم، البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة.";Mt+=`
      <div class="invoice-footer">
        <p>${n}</p>
        <p style="margin-top: 4px; font-size: 8px; font-family: monospace; opacity: 0.6;">Powered by YK MS ERP • v1.0.0</p>
      </div>
    `}const Lt=`
    <div class="metadata-card" style="margin: 0 auto; max-width: 100%; width: 100%; box-sizing: border-box; padding: 0 !important; overflow: hidden; border-top: 3px solid #3b82f6 !important;">
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 1.05em; font-weight: var(--font-weight-bold); color: #1e3a8a; font-family: monospace; white-space: nowrap;">${o.invoice_number}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>رقم الفاتورة</span>
              ${Rt}
            </div>
          </td>
        </tr>
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">${o.date}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>التاريخ</span>
              ${Qt}
            </div>
          </td>
        </tr>
        ${o.time?`
        <tr class="meta-row" style="border-bottom: 1px solid #e2e8f0 !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">${o.time}</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>الوقت</span>
              ${Jt}
            </div>
          </td>
        </tr>
        `:""}
        <tr class="meta-row" style="border-bottom: none !important;">
          <td style="padding: 0.55em 0.7em; text-align: left; vertical-align: middle; white-space: nowrap;">
            <span class="meta-val" style="font-size: 0.95em; font-weight: var(--font-weight-bold); white-space: nowrap;">نقدي</span>
          </td>
          <td style="padding: 0.55em 0.7em; text-align: right; vertical-align: middle; white-space: nowrap; color: #64748b; font-size: 0.9em; font-weight: var(--font-weight-bold);">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; white-space: nowrap; direction: rtl;">
              <span>طريقة الدفع</span>
              ${Kt}
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;let gt="";a==="80mm"?gt=`
      <div style="text-align: center; margin-bottom: 1.2em; padding-bottom: 0.8em; border-bottom: 1px dashed #cbd5e1 !important; width: 100%; position: relative;">
        ${h}
        ${r.showCompanyBlock&&f?`<div style="margin-bottom: 0.6em; text-align: center;">${f}</div>`:""}
        ${r.showCompanyBlock?`
          <div style="text-align: center; margin-bottom: 0.8em;">
            ${t!=null&&t.company_name?`<div class="shop-title" style="font-size: 1.4em !important;">${t.company_name}</div>`:""}
            <div class="shop-subtitle" style="font-size: 0.85em !important; margin-bottom: 0.3em; color: #3b82f6 !important;">${t!=null&&t.company_activity&&(t==null?void 0:t.company_activity)!=="false"?t.company_activity:"قطع غيار السيارات والزيوت والإطارات"}</div>
            ${t!=null&&t.company_phone?`
              <div style="font-size: 0.85em; margin-bottom: 0.15em; display: flex; align-items: center; justify-content: center; gap: 0.3em; direction: rtl;">
                <strong>الهاتف:</strong>
                <span class="meta-val" style="font-family: 'JetBrains Mono', monospace !important; direction: ltr; unicode-bidi: embed;">${t.company_phone}</span>
              </div>
            `:""}
            ${t!=null&&t.company_address?`<div style="font-size: 0.8em; color: #64748b;">العنوان: ${t.company_address}</div>`:""}
          </div>
        `:""}
        ${r.showInvoiceDetails?`
          <div style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 0.8em; margin-top: 0.8em;">
            ${Lt}
          </div>
        `:""}
      </div>
    `:gt=r.showInvoiceDetails?`
      <div style="position: relative; width: 100%; border-bottom: 2px dashed #cbd5e1 !important; padding-bottom: 1em; margin-bottom: 1.2em;">
        ${h}
        <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
          <tr>
            <td style="vertical-align: bottom; width: ${a==="A5"?"55%":"60%"}; border: none !important; padding: 0;">
              ${O}
            </td>
            <td style="vertical-align: bottom; width: ${a==="A5"?"45%":"40%"}; border: none !important; padding: 0; padding-right: 1.0em;">
              ${Lt}
            </td>
          </tr>
        </table>
      </div>
    `:`
      <div style="position: relative; width: 100%; border-bottom: 2px dashed #cbd5e1 !important; padding-bottom: 1em; margin-bottom: 1.2em;">
        ${h}
        <table class="header-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
          <tr>
            <td style="vertical-align: top; width: 100%; border: none !important; padding: 0;">
              ${O}
            </td>
          </tr>
        </table>
      </div>
    `;const dt=Ut(o.items||[],a,r,t,o);let Pt="";return dt.forEach((n,C)=>{const Q=C===0,Tt=C===dt.length-1;let At=0;for(let M=0;M<C;M++)At+=dt[M].length;let ht="";n.forEach((M,Yt)=>{ht+="<tr>",S.forEach(G=>{let U="";if(G==="index")U=String(At+Yt+1);else if(G==="barcode")U=M.product_barcode_snapshot||"-";else if(G==="name"){const Bt=M.product_name_fr||M.product_name_snapshot||"",vt=M.product_name||"",Vt=vt&&ft(vt)!==ft(Bt);U=`
            <div>
              <div class="product-title-main" style="font-size: 1.05em; color: #0f172a; line-height: 1.2;">
                ${Bt}
              </div>
              ${Vt?`
                <div class="product-title-arabic" style="font-weight: normal; font-size: 0.85em; color: #64748b; margin-top: 2px;">
                  ${vt}
                </div>
              `:""}
            </div>
          `}else G==="quantity"?U=`${M.quantity}`:G==="unit"?U=M.unit||"قطع":G==="price"?U=V(M.unit_price||0):G==="discount"?U=M.item_discount_amount>0?V(M.item_discount_amount):"-":G==="total"&&(U=V(M.total||0));ht+=`<td style="${J(G)}">${U}</td>`}),ht+="</tr>"});const qt=dt.length>1?`
      <div style="position: absolute; bottom: 8px; left: 15px; font-size: 9px; color: #64748b; font-weight: bold; font-family: 'Tahoma', Arial, sans-serif;" dir="rtl">
        صفحة ${C+1} من ${dt.length}
      </div>
    `:"";Pt+=`
      <div class="print-page" style="position: relative;">
        ${l?`
          <div class="secondary-logo-container" style="${st}">
            <img class="header-logo" src="${l}" alt="Secondary Logo" style="width: 100%; height: 100%; object-fit: cover; border: 2px solid #cbd5e1 !important; border-radius: ${mt};" />
          </div>
        `:""}
        <div class="page-content-top">
          ${Q?gt:""}
          ${Q?et:""}
          ${Q?X:""}
          
          <table class="items-table">
            <thead>
              ${_}
            </thead>
            <tbody>
              ${ht}
            </tbody>
          </table>
        </div>
        
        <div class="page-content-bottom">
          ${Tt?E:""}
          ${Tt?Mt:""}
        </div>
        
        ${qt}
      </div>
    `}),`
    <div class="invoice-container size-${a}">
      <style>${at}</style>
      ${Pt}
    </div>
  `.trim()}const ie=({invoice:o,settings:t,paperSize:a,templateType:i,config:r,columnOrder:W,onHeaderClick:S,onLogoDrag:J,isLogoDraggable:q=!1})=>{const F=W.filter(c=>c==="index"?!0:c==="barcode"?r.showColBarcode:c==="name"?r.showColName:c==="quantity"?r.showColQty:c==="unit"?r.showColUnit:c==="price"?r.showColPrice:c==="discount"?r.showColDiscount:c==="total"?r.showColTotal:!1),B=c=>c==="index"?"w-[5%] text-center":c==="barcode"?"w-[14%] text-center":c==="name"?"w-[44%] text-right":c==="quantity"?"w-[9%] text-center":c==="unit"?"w-[7%] text-center":c==="price"?"w-[11%] text-center":c==="discount"?"w-[8%] text-center":c==="total"?"w-[13%] text-left font-bold":"",K=!!r.showQuotationMode,at=(t==null?void 0:t.company_rc)&&j("company_rc_enabled",t),Y=(t==null?void 0:t.company_nif)&&j("company_nif_enabled",t),k=(t==null?void 0:t.company_nis)&&j("company_nis_enabled",t),V=(t==null?void 0:t.company_art)&&j("company_art_enabled",t),rt=(t==null?void 0:t.company_cb)&&j("company_cb_enabled",t),g=r.notesText!==void 0&&r.notesText!==""?r.notesText:o.notes,A=r.showNotes&&g&&String(g).trim()!=="",Z=parseInt((t==null?void 0:t.logo_size)||"80",10),N=a==="A5"?.72:a==="80mm"?.65:1,T=`${Math.round(Z*N)}px`,D=(t==null?void 0:t.logo_shape)||"circle",R=D==="circle"?"50%":"12px",L=parseFloat((t==null?void 0:t.logo_opacity)||"100")/100,y=(t==null?void 0:t.logo_grayscale)==="true"?"grayscale(100%)":"none",w=(t==null?void 0:t.logo_position)||"right",m={float:w==="left"?"left":w==="right"?"right":"none",shapeOutside:D==="circle"?"circle(50%)":"none",shapeMargin:"12px",margin:w==="left"?"0 15px 10px 0":w==="right"?"0 0 10px 15px":"0 auto 10px auto",width:T,height:T,opacity:L,filter:y,borderRadius:R,overflow:"hidden",display:w==="center"?"block":"inline-block"},p=(t==null?void 0:t.secondary_logo)||"",b=parseInt((t==null?void 0:t.secondary_logo_size)||"80",10),d=`${Math.round(b*N)}px`,h=((t==null?void 0:t.secondary_logo_shape)||"circle")==="circle"?"50%":"12px",u=parseFloat((t==null?void 0:t.secondary_logo_opacity)||"100")/100,it=(t==null?void 0:t.secondary_logo_grayscale)==="true"?"grayscale(100%)":"none",mt=parseInt((t==null?void 0:t.secondary_logo_x)||"0",10),bt=parseInt((t==null?void 0:t.secondary_logo_y)||"0",10),xt=Math.round(mt*N),$t=Math.round(bt*N),wt={position:"absolute",zIndex:50,width:d,height:d,opacity:u,filter:it,borderRadius:h,overflow:"hidden",userSelect:"none",cursor:q?"move":"default",transform:`translate(${xt}px, ${$t}px)`,transition:"transform 0.1s ease",left:"1.5em",top:"1em",border:q?"2px dashed #3b82f6":"none"},yt=c=>{if(!q||!J)return;c.preventDefault();const H=c.clientX,X=c.clientY,O=parseInt((t==null?void 0:t.secondary_logo_x)||"0",10),et=parseInt((t==null?void 0:t.secondary_logo_y)||"0",10),s=z=>{const v=z.clientX-H,$=z.clientY-X,ot=Math.round(v/N),E=Math.round($/N);J(O+ot,et+E)},_=()=>{document.removeEventListener("mousemove",s),document.removeEventListener("mouseup",_)};document.addEventListener("mousemove",s),document.addEventListener("mouseup",_)},P=c=>`${(c||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} د.ج`,lt=c=>(c||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),ut=r.fontWeightPercent!==void 0?r.fontWeightPercent:80,st=400+Math.round((ut-50)*10),ct=String(Math.max(400,Math.min(900,st))),pt=String(Math.max(600,Math.min(900,st+200))),I=Ut(o.items||[],a,r,t,o);return e.jsxs("div",{className:"flex flex-col gap-6 w-full items-center print-preview-container select-none",children:[e.jsx("style",{children:`
        @media print {
          @page {
            margin: 0 !important;
          }
          .print-preview-sheet .items-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-preview-sheet .totals-and-notes {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-preview-sheet .metadata-card,
          .print-preview-sheet .info-section,
          .print-preview-sheet .legal-grid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .print-preview-sheet {
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
          font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
          --font-weight-base: 500;
          --font-weight-bold: 800;
          line-height: 1.4 !important;
        }
        
        .print-preview-sheet.size-A4,
        .print-preview-sheet.size-A5 {
          border-top: 5px solid #3b82f6 !important;
        }

        .print-page-content-top {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          width: 100%;
          flex: 1;
        }
        
        .print-page-content-bottom {
          width: 100%;
          margin-top: auto;
        }

        .print-preview-sheet td,
        .print-preview-sheet th,
        .print-preview-sheet p,
        .print-preview-sheet div,
        .print-preview-sheet span,
        .print-preview-sheet strong,
        .print-preview-sheet h1,
        .print-preview-sheet table {
          border-color: #cbd5e1;
        }

        .print-preview-sheet strong,
        .print-preview-sheet th,
        .print-preview-sheet th *,
        .print-preview-sheet b,
        .print-preview-sheet .font-bold,
        .print-preview-sheet .font-extrabold {
          font-weight: var(--font-weight-bold) !important;
        }
        
        .print-preview-sheet .shop-title {
          font-size: 2.2em !important;
          font-weight: 900 !important;
          color: #0f172a !important;
          margin: 0 !important;
          line-height: 1.1 !important;
        }

        .print-preview-sheet .shop-subtitle {
          font-size: 1em !important;
          color: #3b82f6 !important;
          margin-top: 0.2em !important;
          margin-bottom: 0.4em !important;
        }

        .print-preview-sheet .metadata-card,
        .print-preview-sheet .metadata-card *,
        .print-preview-sheet .info-section,
        .print-preview-sheet .info-section *,
        .print-preview-sheet .legal-grid,
        .print-preview-sheet .legal-grid * {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .metadata-card {
          border: 1px solid #cbd5e1 !important;
          border-top: 3px solid #3b82f6 !important;
          border-radius: 0.8em !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 18em !important;
          display: inline-block !important;
          overflow: hidden !important;
        }

        .size-80mm .metadata-card,
        .size-A5 .metadata-card {
          max-width: 100% !important;
          width: 100% !important;
          display: block !important;
        }

        .print-preview-sheet .meta-row {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .print-preview-sheet .meta-row:last-child {
          border-bottom: none !important;
        }

        .print-preview-sheet .info-section {
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          padding: 0.7em 1.2em !important;
          margin-bottom: 1.2em !important;
        }

        .print-preview-sheet .items-table,
        .print-preview-sheet .totals-table,
        .print-preview-sheet .metadata-card,
        .print-preview-sheet .meta-val,
        .print-preview-sheet .legal-box,
        .print-preview-sheet .info-section {
          font-family: 'Cairo', 'Tahoma', 'Segoe UI', sans-serif !important;
        }

        /* Custom range slider font weight thickness applies SPECIFICALLY to table body cells (td) as requested */
        .print-preview-sheet .items-table td,
        .print-preview-sheet .totals-table td {
          font-weight: ${ct} !important;
        }

        .print-preview-sheet .items-table td .product-title-main {
          font-weight: var(--font-weight-bold) !important;
        }

        .print-preview-sheet .totals-table tr.grand-total-row td {
          font-weight: ${pt} !important;
        }

        .print-preview-sheet table.items-table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          overflow: hidden !important;
        }
        
        .print-preview-sheet table.items-table th {
          background-color: #f8fafc !important;
          color: #0f172a !important;
          border-bottom: 4px double #3b82f6 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.75em 0.65em !important;
          font-size: 0.9em !important;
        }
        
        .print-preview-sheet table.items-table th:last-child {
          border-left: none !important;
        }
        
        /* Force light theme colors on preview items table even in dark mode */
        .print-preview-sheet table.items-table tr:nth-child(odd) td {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.55em 0.6em !important;
        }
        .print-preview-sheet table.items-table tr:nth-child(even) td {
          background-color: #f8fafc !important;
          color: #1e293b !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.55em 0.6em !important;
        }
        
        .print-preview-sheet table.items-table td:last-child {
          border-left: none !important;
        }
        
        .print-preview-sheet table.items-table tr:last-child td {
          border-bottom: none !important;
        }

        .print-preview-sheet .totals-and-notes {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          gap: 1.5em !important;
          margin-top: 0.8em !important;
          width: 100% !important;
        }

        .print-preview-sheet .notes-block {
          flex: 1 !important;
          min-width: 0 !important;
        }

        .print-preview-sheet .totals-block {
          width: 22em !important;
          flex-shrink: 0 !important;
          margin-right: auto !important;
        }

        .size-80mm .totals-and-notes .totals-block {
          width: 100% !important;
          margin-right: 0 !important;
        }

        .print-preview-sheet .totals-table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0.8em !important;
          overflow: hidden !important;
        }

        /* Force light theme colors on preview totals table even in dark mode */
        .print-preview-sheet .totals-table td {
          border-bottom: 1px solid #cbd5e1 !important;
          border-left: 1px solid #cbd5e1 !important;
          padding: 0.6em 0.8em !important;
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .totals-table td:last-child {
          border-left: none !important;
        }

        .print-preview-sheet .totals-table tr:last-child td {
          border-bottom: none !important;
        }

        /* Clean high-contrast row for final total remaining (SPECIFICITY RESISTANT) */
        .print-preview-sheet tr.remaining-bar,
        .print-preview-sheet tr.remaining-bar td {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          border-top: 2px solid #0f172a !important;
          border-bottom: 4px double #0f172a !important;
          border-left: none !important;
        }

        .print-preview-sheet .text-red-500 {
          color: #ef4444 !important;
        }
        .print-preview-sheet .text-green-600 {
          color: #10b981 !important;
        }
        
        .size-80mm th, .size-80mm td { padding: 0.5em 0.1em !important; font-size: 0.85em !important; }
        .size-80mm th, .size-80mm th * { background-color: transparent !important; color: #1e293b !important; }
        .size-80mm th { border-bottom: 1px dashed #000 !important; }
        .size-80mm .shop-title { font-size: 1.4em !important; text-align: center; }
        .size-80mm .logo-container { text-align: center; }
        .size-80mm .totals-table { width: 100% !important; }
        .size-80mm {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          font-size: 12px !important;
          font-weight: bold !important;
        }

        /* High-contrast Monochrome Printing Optimization for 80mm Thermal Paper */
        .size-80mm,
        .size-80mm * {
          color: #000000 !important;
          -webkit-font-smoothing: none !important;
          -moz-osx-font-smoothing: none !important;
          font-smoothing: none !important;
          text-rendering: optimizeSpeed !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        .size-80mm table,
        .size-80mm th,
        .size-80mm td,
        .size-80mm div,
        .size-80mm span,
        .size-80mm hr {
          border-color: #000000 !important;
        }
        .size-80mm .totals-and-notes { display: block !important; }
        
        /* Elegant dashed divider above footer */
        .print-preview-sheet .invoice-footer {
          margin-top: 2em !important;
          border-top: 2px dashed #94a3b8 !important;
          padding-top: 1em !important;
        }

        /* Complete Dark Mode Prevention for Print Preview */
        .dark .print-preview-sheet,
        .dark .print-preview-sheet * {
          background-color: transparent;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet {
          background-color: #ffffff !important;
          /* Force Light Theme variables inside the print preview sheet to prevent white-on-white text */
          --bg-primary: 219 233 244 !important;
          --bg-secondary: 255 255 255 !important;
          --bg-card: 255 255 255 !important;
          --text-primary: 15 23 42 !important;
          --text-secondary: 51 65 85 !important;
          --text-muted: 100 116 139 !important;
          --border-default: 0 0 0 !important;
          --border-alpha: 0.18 !important;
          --border-light: 0 0 0 !important;
        }

        .dark .print-preview-sheet .metadata-card,
        .dark .print-preview-sheet .metadata-card *,
        .dark .print-preview-sheet .info-section,
        .dark .print-preview-sheet .info-section *,
        .dark .print-preview-sheet .legal-grid,
        .dark .print-preview-sheet .legal-grid *,
        .dark .print-preview-sheet .notes-block,
        .dark .print-preview-sheet .notes-block * {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .print-preview-sheet .legal-grid th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .dark .print-preview-sheet .legal-grid th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .dark .print-preview-sheet table.items-table,
        .dark .print-preview-sheet table.items-table * {
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet table.items-table th,
        .dark .print-preview-sheet table.items-table th * {
          background-color: #f8fafc !important;
          color: #0f172a !important;
          border-bottom: 3px solid #3b82f6 !important;
        }

        .dark .print-preview-sheet table.items-table tr td,
        .dark .print-preview-sheet table.items-table td {
          color: #1e293b !important;
        }

        .dark .print-preview-sheet table.items-table tr:nth-child(odd),
        .dark .print-preview-sheet table.items-table tr:nth-child(odd) td {
          background-color: #ffffff !important;
        }

        .dark .print-preview-sheet table.items-table tr:nth-child(even),
        .dark .print-preview-sheet table.items-table tr:nth-child(even) td {
          background-color: #f8fafc !important;
        }

        .dark .print-preview-sheet table.totals-table,
        .dark .print-preview-sheet table.totals-table * {
          border-color: #cbd5e1 !important;
        }

        .dark .print-preview-sheet table.totals-table tr td,
        .dark .print-preview-sheet table.totals-table td {
          background-color: #ffffff !important;
          color: #1e293b !important;
        }

        .dark .print-preview-sheet table.totals-table tr.remaining-bar,
        .dark .print-preview-sheet table.totals-table tr.remaining-bar td {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          border-top: 2px solid #0f172a !important;
          border-bottom: 4px double #0f172a !important;
        }
        
        .dark .print-preview-sheet .text-red-500 {
          color: #ef4444 !important;
        }
        .dark .print-preview-sheet .text-green-600 {
          color: #10b981 !important;
        }
        
        .dark .print-preview-sheet .text-gray-400,
        .dark .print-preview-sheet .text-gray-500,
        .dark .print-preview-sheet .text-gray-600 {
          color: #475569 !important;
        }
        .dark .print-preview-sheet .text-blue-500,
        .dark .print-preview-sheet .text-blue-900 {
          color: #1e3a8a !important;
        }

        /* Monochrome and Bold Overrides for Thermal Print (Placed at the end to win the cascade in preview) */
        .size-80mm,
        .size-80mm * {
          color: #000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          font-weight: bold !important; /* Force thick text to prevent thermal fade/erosion */
          -webkit-font-smoothing: none !important;
          -moz-osx-font-smoothing: none !important;
          font-smoothing: none !important;
          text-rendering: optimizeSpeed !important;
          text-shadow: none !important;
          box-shadow: none !important;
        }

        .size-80mm table,
        .size-80mm th,
        .size-80mm td,
        .size-80mm div,
        .size-80mm span,
        .size-80mm hr {
          border-color: #000000 !important;
        }



        .size-80mm table.items-table th {
          border-bottom: 2px solid #000000 !important;
          border-top: 1px solid #000000 !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 0.35em 0.1em !important;
          font-size: 0.85em !important;
        }

        /* Vertical Stacking of Customer & Phone Info for Roll paper */
        .size-80mm .info-section {
          padding: 0.4em !important;
          margin-bottom: 0.8em !important;
          border: 1px solid #000000 !important;
        }
        .size-80mm .info-table,
        .size-80mm .info-section table,
        .size-80mm .info-section tbody,
        .size-80mm .info-section tr {
          display: block !important;
          width: 100% !important;
        }
        .size-80mm .info-table td,
        .size-80mm .info-section td {
          display: block !important;
          width: 100% !important;
          text-align: right !important;
          padding: 0.3em 0 !important;
          border: none !important;
          direction: rtl !important;
        }
        .size-80mm .info-table td strong,
        .size-80mm .info-section td strong {
          font-size: 0.95em !important;
          font-weight: bold !important;
          display: inline-block !important;
          flex-shrink: 0 !important;
          min-width: 4.5em !important;
          color: #000000 !important;
        }
        .size-80mm .info-table td span,
        .size-80mm .info-section td span {
          font-size: 1em !important;
          font-weight: bold !important;
          margin-right: 0.4em !important;
          color: #000000 !important;
          display: inline-block !important;
        }
        /* React layout specific handles for inner flex components inside td */
        .size-80mm .info-section td span.flex {
          display: flex !important;
          justify-content: flex-start !important;
          width: 100% !important;
          direction: rtl !important;
        }
      `}),I.map((c,H)=>{const X=H===0,O=H===I.length-1;let et=0;for(let s=0;s<H;s++)et+=I[s].length;return e.jsxs("div",{className:`bg-white text-[#1e293b] shadow-xl border border-gray-200 overflow-hidden rounded-md transition-all duration-300 print-preview-sheet size-${a} relative flex flex-col justify-between`,dir:"rtl",style:{width:a==="80mm"?"80mm":a==="A5"?"148mm":"210mm",height:a==="80mm"?"auto":a==="A5"?"210mm":"297mm",fontSize:a==="80mm"?"10px":a==="A5"?"9.2px":"13px",padding:a==="80mm"?"5mm 3mm":a==="A5"?"8mm 6mm":"10mm 8mm",boxSizing:"border-box"},children:[p&&e.jsx("div",{className:"secondary-logo-container flex shrink-0 justify-center animate-fade-in print-only-absolute",style:{...wt,pointerEvents:q?"auto":"none"},onMouseDown:yt,children:e.jsx("img",{className:"object-cover header-logo",src:p,alt:"Secondary Logo",style:{width:"100%",height:"100%",borderRadius:h}})}),e.jsxs("div",{className:"print-page-content-top",children:[X&&(a==="80mm"?e.jsxs("div",{className:"flex flex-col items-center text-center gap-3 mb-4 pb-3 border-b border-dashed border-gray-300 relative",children:[r.showCompanyBlock&&(t==null?void 0:t.store_logo)&&e.jsx("div",{className:"logo-container flex justify-center shrink-0",style:{width:T,height:T,opacity:L,filter:y,borderRadius:R,overflow:"hidden"},children:e.jsx("img",{className:"object-cover header-logo",src:t.store_logo,alt:"Logo",style:{width:"100%",height:"100%",borderRadius:R}})}),r.showCompanyBlock&&e.jsxs("div",{className:"text-center",children:[(t==null?void 0:t.company_name)&&e.jsx("h1",{className:"shop-title text-xl font-black",children:t.company_name}),e.jsx("p",{className:"shop-subtitle text-xs text-blue-500 font-bold m-0",children:t!=null&&t.company_activity&&(t==null?void 0:t.company_activity)!=="false"?t.company_activity:"قطع غيار السيارات والزيوت والإطارات"}),(t==null?void 0:t.company_phone)&&e.jsxs("div",{className:"text-xs text-gray-600 m-0 flex items-center justify-center gap-1.5 font-bold",style:{direction:"rtl"},children:[e.jsxs("span",{className:"flex items-center gap-1 shrink-0",children:[e.jsx(_t,{size:12,className:"text-gray-400"}),e.jsx("span",{children:"الهاتف:"})]}),e.jsx("span",{className:"font-mono",style:{direction:"ltr",unicodeBidi:"embed"},children:t.company_phone})]}),(t==null?void 0:t.company_address)&&e.jsxs("p",{className:"text-xs text-gray-500 m-0 flex items-center justify-center gap-1",children:[e.jsxs("span",{children:["العنوان: ",t.company_address]}),e.jsx(Dt,{size:12,className:"text-gray-400"})]})]}),r.showInvoiceDetails&&e.jsx("div",{className:"metadata-card w-full max-w-xs mt-2",children:e.jsx("table",{className:"w-full border-collapse",children:e.jsxs("tbody",{children:[e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 text-left font-black text-blue-900 text-sm",children:o.invoice_number}),e.jsxs("td",{className:"py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold",children:["رقم الفاتورة ",e.jsx(kt,{size:13,className:"text-gray-400 shrink-0"})]})]}),e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 text-left text-sm",children:o.date}),e.jsxs("td",{className:"py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold",children:["التاريخ ",e.jsx(Ht,{size:13,className:"text-gray-400 shrink-0"})]})]}),o.time&&e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 text-left text-sm",children:o.time}),e.jsxs("td",{className:"py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold",children:["الوقت ",e.jsx(St,{size:13,className:"text-gray-400 shrink-0"})]})]}),e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 text-left text-sm",children:"نقدي"}),e.jsxs("td",{className:"py-1.5 text-right text-gray-500 text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold",children:["طريقة الدفع ",e.jsx(Ft,{size:13,className:"text-gray-400 shrink-0"})]})]})]})})})]}):e.jsx("div",{className:"relative mb-5 w-full",children:e.jsxs("div",{className:"flex justify-between items-end gap-4 pb-4 border-b-2 border-dashed border-gray-300 w-full",children:[r.showCompanyBlock&&e.jsxs("div",{className:`${r.showInvoiceDetails?a==="A5"?"w-[55%]":"w-[60%]":"w-full"} block text-right`,style:{minHeight:T},children:[(t==null?void 0:t.store_logo)&&e.jsx("div",{className:"logo-container",style:m,children:e.jsx("img",{className:"object-cover header-logo",src:t.store_logo,alt:"Logo",style:{width:"100%",height:"100%",borderRadius:R}})}),e.jsxs("div",{className:"company-text-content",style:{textAlign:w==="center"?"center":"right",borderRight:w==="center"||w==="right"?"none":"4px solid #3b82f6",paddingRight:w==="center"||w==="right"?0:"12px"},children:[(t==null?void 0:t.company_name)&&e.jsx("h1",{className:"shop-title",style:{textAlign:w==="center"?"center":"right"},children:t.company_name}),e.jsx("p",{className:"shop-subtitle",style:{textAlign:w==="center"?"center":"right"},children:t!=null&&t.company_activity&&(t==null?void 0:t.company_activity)!=="false"?t.company_activity:"قطع غيار السيارات والزيوت والإطارات"}),(t==null?void 0:t.company_phone)&&e.jsxs("div",{className:"text-xs text-gray-600 m-0 font-bold flex items-center gap-1.5",style:{justifyContent:w==="center"?"center":"flex-start",direction:"rtl",marginBottom:"0.25em"},children:[e.jsxs("span",{className:"flex items-center gap-1 shrink-0",children:[e.jsx(_t,{size:12,className:"text-gray-400"}),e.jsx("span",{children:"الهاتف:"})]}),e.jsx("span",{className:"font-mono",style:{direction:"ltr",unicodeBidi:"embed"},children:t.company_phone})]}),(t==null?void 0:t.company_address)&&e.jsxs("p",{className:"text-xs text-gray-500 m-0",style:{textAlign:w==="center"?"center":"right"},children:[e.jsx("span",{className:"inline-block align-middle",children:t.company_address}),e.jsx("span",{className:"inline-block align-middle mr-1 text-gray-400",children:e.jsx(Dt,{size:12})}),e.jsx("span",{className:"inline-block align-middle mr-1",children:"العنوان:"})]})]})]}),r.showInvoiceDetails&&e.jsx("div",{className:`text-left ${a==="A5"?"w-[45%]":"w-[40%]"} flex justify-end`,children:e.jsx("div",{className:"metadata-card",style:{width:"100%",maxWidth:"100%",boxSizing:"border-box",padding:0,overflow:"hidden",borderTop:"3px solid #3b82f6"},children:e.jsx("table",{className:"w-full border-collapse",children:e.jsxs("tbody",{children:[e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 px-2.5 text-left font-black text-blue-900 text-sm whitespace-nowrap",children:o.invoice_number}),e.jsxs("td",{className:"py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans",children:[e.jsx("span",{children:"رقم الفاتورة"}),e.jsx(kt,{size:12,className:"text-gray-400 shrink-0"})]})]}),e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap",children:o.date}),e.jsxs("td",{className:"py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans",children:[e.jsx("span",{children:"التاريخ"}),e.jsx(Ht,{size:12,className:"text-gray-400 shrink-0"})]})]}),o.time&&e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap",children:o.time}),e.jsxs("td",{className:"py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans",children:[e.jsx("span",{children:"الوقت"}),e.jsx(St,{size:12,className:"text-gray-400 shrink-0"})]})]}),e.jsxs("tr",{className:"meta-row",children:[e.jsx("td",{className:"meta-val py-1.5 px-2.5 text-left text-sm whitespace-nowrap",children:"نقدي"}),e.jsxs("td",{className:"py-1.5 px-2.5 text-right text-gray-500 text-[10px] md:text-xs flex items-center justify-end gap-1.5 whitespace-nowrap font-bold font-sans",children:[e.jsx("span",{children:"طريقة الدفع"}),e.jsx(Ft,{size:12,className:"text-gray-400 shrink-0"})]})]})]})})})})]})})),X&&r.showCustomerBlock&&!zt(o.customer_name)&&e.jsx("div",{className:"info-section",style:{border:"1px solid #cbd5e1"},children:e.jsx("table",{className:"w-full border-collapse",children:e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsx("td",{className:"p-0 border-none text-right vertical-middle w-[55%]",children:e.jsxs("span",{className:"flex items-center gap-1.5 text-sm font-bold text-gray-800",children:[e.jsx(It,{size:13,className:"text-gray-400"}),e.jsx("strong",{style:{fontSize:"0.9em"},children:"العميل:"}),e.jsx("span",{children:o.customer_name})]})}),e.jsx("td",{className:"p-0 border-none vertical-middle w-[45%]",children:e.jsxs("div",{className:"flex items-center justify-end gap-1.5 text-sm font-bold text-gray-800",style:{direction:"rtl"},children:[e.jsxs("span",{className:"flex items-center gap-1 shrink-0",children:[e.jsx(_t,{size:13,className:"text-gray-400"}),e.jsx("strong",{style:{fontSize:"0.9em"},children:"الهاتف:"})]}),e.jsx("span",{className:"font-mono",style:{direction:"ltr",unicodeBidi:"embed"},children:o.customer_phone||"—"})]})})]})})})}),X&&r.showCompanyOfficialDetails&&(at||Y||k||V||rt)&&(()=>{const s=[];return at&&s.push({label:"سجل تجاري (RC)",val:t.company_rc}),Y&&s.push({label:"رقم جبائي (NIF)",val:t.company_nif}),k&&s.push({label:"رقم إحصائي (NIS)",val:t.company_nis}),V&&s.push({label:"رقم المادة (Art)",val:t.company_art}),rt&&s.push({label:"الحساب البنكي (CB)",val:t.company_cb}),e.jsx("div",{className:"mb-4 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm legal-grid",dir:"rtl",children:e.jsxs("table",{className:"w-full border-collapse text-center text-xs",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-gray-300 text-gray-800 font-bold",children:s.map((_,z)=>e.jsx("th",{className:"py-2 px-3 border-l border-gray-300 last:border-l-0 text-center font-bold text-[10px] md:text-xs",style:{backgroundColor:"#f1f5f9",color:"#0f172a"},children:_.label},z))})}),e.jsx("tbody",{children:e.jsx("tr",{className:"text-gray-800 font-semibold font-mono",children:s.map((_,z)=>e.jsx("td",{className:"py-2.5 px-3 border-l border-gray-300 last:border-l-0 text-center text-xs md:text-sm font-bold bg-white text-slate-900",children:_.val},z))})})]})})})(),e.jsxs("table",{className:"w-full border-collapse mb-4 text-xs items-table",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-gray-300 bg-gray-50 text-gray-700 font-bold",children:F.map(s=>e.jsx("th",{onContextMenu:_=>{_.preventDefault(),S&&S(_,s)},className:`py-2 px-1 text-xs border-b-2 border-gray-200 select-none ${B(s)} cursor-context-menu`,title:"انقر بزر الفأرة الأيمن لتخصيص الأعمدة",children:Wt[s]},s))})}),e.jsx("tbody",{className:"divide-y divide-gray-100",children:c.map((s,_)=>{const z=et+_;return e.jsx("tr",{className:"hover:bg-gray-50/50",children:F.map(v=>{let $="";if(v==="index")$=z+1;else if(v==="barcode")$=s.product_barcode_snapshot||"-";else if(v==="name"){const ot=s.product_name_fr||s.product_name_snapshot||"",E=s.product_name||"",Ct=E&&ft(E)!==ft(ot);$=e.jsxs("div",{children:[e.jsx("div",{className:"product-title-main text-slate-900 text-[1.05em] leading-tight",children:ot}),Ct&&e.jsx("div",{className:"product-title-arabic text-[0.85em] font-normal text-gray-500 mt-0.5",children:E})]})}else v==="quantity"?$=s.quantity:v==="unit"?$=s.unit||"قطع":v==="price"?$=lt(s.unit_price||0):v==="discount"?$=s.item_discount_amount>0?lt(s.item_discount_amount):"-":v==="total"&&($=lt(s.total||0));return e.jsx("td",{className:`py-2 px-1 ${B(v)}`,children:$},v)})},_)})})]})]}),e.jsxs("div",{className:"print-page-content-bottom",children:[O&&(r.compactFooter||o.items&&o.items.length>17?e.jsxs("div",{className:"w-full flex flex-col gap-1.5 mt-2 font-sans",children:[A&&e.jsxs("div",{className:"border border-gray-300 rounded-[0.5em] p-[0.45em_0.8em] bg-white text-[10.5px] text-right text-gray-700 shadow-sm leading-normal",children:[e.jsx("strong",{children:"ملاحظة:"})," ",g]}),e.jsxs("div",{className:"border border-gray-300 rounded-[0.5em] p-[0.45em_0.8em] bg-slate-50 text-[10.5px] w-full flex flex-wrap justify-between items-center gap-2",style:{direction:"rtl"},children:[o.global_discount_amount>0&&e.jsxs("div",{className:"whitespace-nowrap",children:[e.jsx("strong",{className:"text-red-500",children:"الخصم:"})," ",e.jsx("span",{className:"meta-val text-red-500",children:P(o.global_discount_amount)})]}),o.tax_amount>0&&e.jsxs("div",{className:"whitespace-nowrap",children:[e.jsxs("strong",{children:["الضريبة (",o.tax_percent,"%):"]})," ",e.jsx("span",{className:"meta-val",children:P(o.tax_amount)})]}),e.jsxs("div",{className:"whitespace-nowrap",children:[e.jsx("strong",{className:"text-green-600",children:"المدفوع:"})," ",e.jsx("span",{className:"meta-val text-green-600",children:P(o.paid)})]}),e.jsxs("div",{className:"whitespace-nowrap",children:[e.jsx("strong",{children:"المتبقي:"})," ",e.jsx("span",{className:"meta-val",children:P(o.remaining)})]}),e.jsxs("div",{className:"bg-slate-100 text-slate-900 border border-gray-300 px-2.5 py-1 rounded-[0.35em] whitespace-nowrap",children:[e.jsxs("strong",{children:[K?"الإجمالي التقديري":"المجموع الإجمالي",":"]})," ",e.jsx("span",{className:"meta-val font-bold text-slate-900",children:P(o.total)})]})]})]}):e.jsxs("div",{className:"totals-and-notes",children:[e.jsx("div",{className:"notes-block",children:A&&e.jsxs("div",{className:"border border-gray-200 rounded-lg p-3 bg-white text-xs text-gray-700 h-full min-h-[8em] flex flex-col shadow-sm",children:[e.jsxs("strong",{style:{display:"flex",alignItems:"center",gap:"4px",fontSize:"1.05em",color:"#0f172a",borderBottom:"1px solid #e2e8f0",paddingBottom:"0.3em",marginBottom:"0.4em"},children:[e.jsx(kt,{size:13,className:"text-gray-400"}),e.jsx("span",{children:"ملاحظة:"})]}),e.jsx("div",{style:{whiteSpace:"pre-wrap",lineHeight:"1.5",color:"#334155"},children:g})]})}),e.jsx("div",{className:"totals-block",children:e.jsx("table",{className:"totals-table",children:e.jsx("tbody",{children:K?e.jsxs("tr",{className:"grand-total remaining-bar font-bold",children:[e.jsx("td",{className:"text-base",style:{borderTopRightRadius:"0.6em",borderBottomRightRadius:"0.6em"},children:"الإجمالي التقديري:"}),e.jsx("td",{className:"text-left text-base",style:{borderTopLeftRadius:"0.6em",borderBottomLeftRadius:"0.6em"},children:P(o.total)})]}):e.jsxs(e.Fragment,{children:[o.global_discount_amount>0&&e.jsxs("tr",{className:"text-red-500 font-bold",children:[e.jsx("td",{children:"الخصم:"}),e.jsx("td",{className:"text-left",children:P(o.global_discount_amount)})]}),o.tax_amount>0&&e.jsxs("tr",{className:"font-bold",children:[e.jsxs("td",{children:["الضريبة (",o.tax_percent,"%):"]}),e.jsx("td",{className:"text-left",children:P(o.tax_amount)})]}),e.jsxs("tr",{className:"text-green-600 font-bold text-xs",children:[e.jsx("td",{children:"المدفوع:"}),e.jsx("td",{className:"text-left",children:P(o.paid)})]}),e.jsxs("tr",{className:"text-gray-600 font-bold text-xs",children:[e.jsx("td",{children:"المبلغ المتبقي:"}),e.jsx("td",{className:"text-left",children:P(o.remaining)})]}),e.jsxs("tr",{className:"remaining-bar font-bold",children:[e.jsx("td",{className:"text-base",style:{borderTopRightRadius:"0.6em",borderBottomRightRadius:"0.6em"},children:"المجموع الإجمالي:"}),e.jsx("td",{className:"text-left text-base",style:{borderTopLeftRadius:"0.6em",borderBottomLeftRadius:"0.6em"},children:P(o.total)})]})]})})})})]})),O&&r.showFooter&&e.jsxs("div",{className:"mt-6 pt-3 text-center text-xs text-gray-400 invoice-footer",children:[e.jsx("p",{className:"m-0 font-bold",children:K?"عرض السعر هذا صالح لمدة 15 يوماً من تاريخ الإصدار. نشكركم على اهتمامكم.":(t==null?void 0:t.receipt_footer)||"شكراً لزيارتكم، البضاعة المباعة لا ترد ولا تستبدل بعد 24 ساعة."}),e.jsx("p",{className:"mt-1 mb-0 text-[9px] font-mono opacity-50",children:"Powered by YK MS ERP"})]})]}),I.length>1&&e.jsxs("div",{className:"absolute bottom-3 left-5 text-[10px] text-gray-400 font-bold font-mono select-none",dir:"rtl",children:["صفحة ",H+1," من ",I.length]})]},H)})]})},Et={amber:{via:"via-warning_amber/70",shadow:"shadow-warning_amber/10"},emerald:{via:"via-emerald-400/70",shadow:"shadow-emerald-400/10"},blue:{via:"via-blue-400/70",shadow:"shadow-blue-400/10"},rose:{via:"via-rose-400/70",shadow:"shadow-rose-400/10"}};function ne({show:o,children:t,width:a="w-[600px]",accentColor:i="amber",className:r="",darkOpacity:W="dark:bg-background_secondary/85"}){const S=Et[i]||Et.amber;return e.jsx(Xt,{children:o&&e.jsxs(Nt.div,{initial:{opacity:0,y:-24,scale:.93},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:-16,scale:.95},transition:{type:"spring",damping:26,stiffness:320},className:`absolute top-full mt-2 ${a} bg-background_secondary/85 ${W} backdrop-blur-2xl border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden z-[200] ${r}`,dir:"rtl",children:[e.jsx(Nt.div,{initial:{scaleX:0},animate:{scaleX:1},transition:{delay:.08,duration:.4,ease:"easeOut"},className:`h-[2px] bg-gradient-to-r from-transparent ${S.via} to-transparent origin-center`}),t]})})}function le({children:o,delay:t=0,className:a=""}){return e.jsx(Nt.div,{initial:{opacity:0,x:20,height:0},animate:{opacity:1,x:0,height:"auto"},transition:{delay:t,type:"spring",damping:22,stiffness:260},className:a,children:o})}export{Wt as C,ae as D,oe as F,ne as G,ie as P,le as a,re as g};
