import { Link, useLocation } from "wouter";
import { BarChart3, FileText, Coins } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "통계",
    url: "/statistics",
    icon: BarChart3,
    testId: "submenu-statistics",
  },
  {
    title: "정산 조회",
    url: "/settlements",
    icon: FileText,
    testId: "submenu-settlement-inquiry",
  },
  {
    title: "정산하기",
    url: "/statistics/settlement-action",
    icon: Coins,
    testId: "submenu-settlement",
  },
];

export function AppSidebarStatistics() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>통계 및 정산</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
