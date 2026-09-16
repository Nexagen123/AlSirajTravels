export const groupTypes = [
  {
    label: "All Groups",
    value: "",
    path: "groups",
    ownGroupType: "",
  },
  {
    label: "Umrah Packages",
    value: "Umrah Packages",
    path: "all-groups",
    ownGroupType: "Umrah Groups",
  },
  {
    label: "Umrah Groups (Only Seats)",
    value: "UMRAH GROUP",
    path: "groups?type_filter=umrah",
    ownGroupType: "Umrah Groups",
  },
  {
    label: "UAE (United Arab Emirates)",
    value: "UAE ONE WAY GROUP",
    path: "groups?type_filter=uae",
    ownGroupType: "UAE Groups",
  },
  {
    label: "KSA Groups",
    value: "ONE WAY GROUP",
    path: "groups?type_filter=ksa",
    ownGroupType: "KSA Groups",
  },
  // {
  //   label: "Kuwait (KWI)",
  //   value: "KUWAIT ONE WAY GROUP",
  //   path: "groups?type_filter=kuwait",
  //   ownGroupType: "Kuwait Groups",
  // },
  {
    label: "Baku Packages",
    value: "BAKU PACKAGES",
    path: "groups?type_filter=baku",
    ownGroupType: "Baku Groups",
  },
];
