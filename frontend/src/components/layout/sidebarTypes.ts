export type SidebarLink = {
  kind?: "link";
  label: string;
  to: string;
  icon: string;
  end?: boolean;
};

export type SidebarDropdown = {
  kind: "dropdown";
  id: string;
  label: string;
  icon: string;
  children: SidebarLink[];
};

export type SidebarItem = SidebarLink | SidebarDropdown;

export type SidebarGroup = {
  title?: string;
  items: SidebarItem[];
};
