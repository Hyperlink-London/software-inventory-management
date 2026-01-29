"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutTable } from "@/components/CheckoutTable";

type CheckoutItem = {
  id: string;
  item_id: string;
  item_name: string;
  image_URL: string | null;
  quantity: number;
  sign_out_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  recipient_full_name: string;
  recipient_id: string;
};

type CollapsibleCheckoutCardProps = {
  checkouts: CheckoutItem[];
  currentUserId: string | null;
  userTeams?: string[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  basePath?: string;
  pageParam?: string;
  initialViewMode?: "yours" | "everyone" | "team" | "returned";
  viewParam?: string;
  returnViewSearchParams?: string;
  activeCount?: number;
  overdueCount?: number;
};

export function CollapsibleCheckoutCard({
  checkouts,
  currentUserId,
  userTeams = [],
  totalCount,
  currentPage = 1,
  pageSize = 10,
  basePath,
  pageParam = "page",
  initialViewMode,
  viewParam,
  returnViewSearchParams,
  activeCount = 0,
  overdueCount = 0,
}: CollapsibleCheckoutCardProps) {
  const showBadge = activeCount > 0 || overdueCount > 0;

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Checkouts
            {showBadge && (
              <span className="ml-2 inline-flex flex-wrap items-center gap-2">
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  {activeCount} Active
                </Badge>
                <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                  {overdueCount} Overdue
                </Badge>
              </span>
            )}
          </CardTitle>
          <Link href="/checkouts">
            <Button variant="outline" size="sm" className="h-8">
              <ExternalLink className="mr-2 h-3 w-3" />
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <CheckoutTable
          checkouts={checkouts}
          currentUserId={currentUserId}
          userTeams={userTeams}
          {...(totalCount != null && basePath != null ? { totalCount, currentPage, pageSize, basePath, pageParam } : {})}
          {...(initialViewMode != null ? { initialViewMode } : {})}
          {...(viewParam != null ? { viewParam } : {})}
          {...(returnViewSearchParams != null ? { returnViewSearchParams } : {})}
        />
      </CardContent>
    </Card>
  );
}

