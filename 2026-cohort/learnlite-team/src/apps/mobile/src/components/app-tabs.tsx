// On the phone the tabs are the pages of TabsPager (see tabs-pager.tsx), so this native entry is
// never rendered. Only the web has its own bar (app-tabs.web.tsx). Keeping the native-tabs
// navigator out of the phone bundle also keeps its icon fonts out of the app.
export default function AppTabs() {
  return null;
}
