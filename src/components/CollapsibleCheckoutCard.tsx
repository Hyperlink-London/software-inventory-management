"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckoutTable } from "@/components/CheckoutTable";
import { cn } from "@/lib/utils";

type CheckoutItem = {
  id: string;
  item_id: string;
  item_name: string;
  image_URL: string | null;
  quantity: number;
  sign_out_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  recipient_username: string;
  recipient_id: string;
};

type CollapsibleCheckoutCardProps = {
  checkouts: CheckoutItem[];
  currentUserId: string | null;
  userTeams?: string[];
};

export function CollapsibleCheckoutCard({
  checkouts,
  currentUserId,
  userTeams = [],
}: CollapsibleCheckoutCardProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  // Count active checkouts for badge
  const activeCheckoutsCount = React.useMemo(() => {
    return checkouts.filter((c) => !c.returned_date).length;
  }, [checkouts]);

  return (
    <Card>
      <CardHeader className="cursor-pointer py-3" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Checkouts
            {activeCheckoutsCount > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {activeCheckoutsCount} active
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Link href="/checkouts" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                View All
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4 transition-transform duration-300" />
              ) : (
                <ChevronDown className="h-4 w-4 transition-transform duration-300" />
              )}
              <span className="sr-only">Toggle checkout table</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isOpen 
            ? "max-h-[5000px] opacity-100" 
            : "max-h-0 opacity-0"
        )}
        style={{
          transition: "max-height 500ms ease-in-out, opacity 400ms ease-in-out",
        }}
      >
        <CardContent 
          className={cn(
            "transition-all duration-500 ease-in-out",
            isOpen 
              ? "translate-y-0 opacity-100" 
              : "-translate-y-2 opacity-0"
          )}
        >
          <CheckoutTable checkouts={checkouts} currentUserId={currentUserId} userTeams={userTeams} />
        </CardContent>
      </div>
    </Card>
  );
}

