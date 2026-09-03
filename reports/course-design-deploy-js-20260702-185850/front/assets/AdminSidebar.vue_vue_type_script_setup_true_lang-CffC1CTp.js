import{c as r,d as y,C as g,u as v,o,a as l,e,f as d,j as c,v as f,F as x,m as w,R as C,n as M,w as _,p as B,q as j,t as V,I as L,G as F,x as h}from"./index-B0xXWB7W.js";import{c as H}from"./utils-C8nBGPD0.js";import{C as R}from"./chevron-left-DIVaHEPN.js";/**
 * @license lucide-vue-next v1.0.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=r("book-open-check",[["path",{d:"M12 21V7",key:"gj6g52"}],["path",{d:"m16 12 2 2 4-4",key:"mdajum"}],["path",{d:"M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3",key:"8arnkb"}]]);/**
 * @license lucide-vue-next v1.0.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=r("clipboard-list",[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]]);/**
 * @license lucide-vue-next v1.0.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=r("file-check-corner",[["path",{d:"M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6",key:"g5mvt7"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"m14 20 2 2 4-4",key:"15kota"}]]);/**
 * @license lucide-vue-next v1.0.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=r("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]]),N={class:"admin-sidebar w-full lg:w-64 shrink-0 border border-black-100 bg-white"},D={class:"p-6 border-b border-black-100"},S={class:"p-3 space-y-1"},O=y({__name:"AdminSidebar",setup(U){const p=g(),i=v(),k=[{label:"考试管理",path:"/admin",icon:z},{label:"题库组卷",path:"/admin/question-bank",icon:q},{label:"人员管理",path:"/admin/people",icon:I},{label:"考卷批改",path:"/admin/grading",icon:A},{label:"通知处理",path:"/admin/notifications",icon:L},{label:"查看成绩",path:"/admin/results",icon:F}],t=h(()=>p.path),b=h(()=>t.value!=="/admin"),m=n=>n==="/admin"?t.value==="/admin"||t.value.startsWith("/admin/exams/"):t.value.startsWith(n),u=()=>{window.history.length>1?i.back():i.push("/admin")};return(n,s)=>(o(),l("aside",N,[e("div",D,[b.value?(o(),l("button",{key:0,onClick:u,class:"mb-4 inline-flex items-center justify-center w-9 h-9 border border-black-200 text-black-500 hover:border-gold-300 hover:text-gold-600 transition-colors",title:"返回上一页"},[d(c(R),{class:"w-5 h-5"})])):f("",!0),s[0]||(s[0]=e("div",{class:"w-12 h-0.5 bg-gold-300 mb-4"},null,-1)),s[1]||(s[1]=e("h2",{class:"font-display text-xl text-black-700"},"后台管理",-1))]),e("nav",S,[(o(),l(x,null,w(k,a=>d(c(C),{key:a.path,to:a.path,class:M(c(H)("flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider border transition-all",m(a.path)?"bg-black-700 text-white border-black-700":"bg-white text-black-500 border-transparent hover:border-gold-300 hover:text-gold-600"))},{default:_(()=>[(o(),B(j(a.icon),{class:"w-4 h-4"})),e("span",null,V(a.label),1)]),_:2},1032,["to","class"])),64))])]))}});export{A as F,I as U,O as _};
