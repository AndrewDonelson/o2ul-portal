// file: /components/shared/Pagination.tsx
// feature: Shared - Generic pagination component

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className
}: PaginationProps) {
    // If there's only one page, don't show pagination
    if (totalPages <= 1) return null;

    // Define how many page buttons to show
    const showMaxPages = 5;

    // Calculate the range of page numbers to display
    let startPage = Math.max(1, currentPage - Math.floor(showMaxPages / 2));
    let endPage = Math.min(totalPages, startPage + showMaxPages - 1);

    // Adjust start page if we're at the end
    if (endPage - startPage + 1 < showMaxPages) {
        startPage = Math.max(1, endPage - showMaxPages + 1);
    }

    // Create array of page numbers to display
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    // Determine if we need to show ellipses
    const showStartEllipsis = startPage > 1;
    const showEndEllipsis = endPage < totalPages;

    return (
        <nav
            className={cn(
                "flex items-center justify-center space-x-1 my-4",
                className
            )}
            aria-label="Pagination"
        >
            {/* Previous page button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8"
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* First page */}
            {showStartEllipsis && (
                <>
                    <Button
                        variant={currentPage === 1 ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onPageChange(1)}
                        className="h-8 w-8"
                    >
                        1
                    </Button>
                    <span className="text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </span>
                </>
            )}

            {/* Page numbers */}
            {pages.map((page) => (
                <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="h-8 w-8"
                    aria-current={currentPage === page ? "page" : undefined}
                >
                    {page}
                </Button>
            ))}

            {/* Last page */}
            {showEndEllipsis && (
                <>
                    <span className="text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </span>
                    <Button
                        variant={currentPage === totalPages ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                        className="h-8 w-8"
                    >
                        {totalPages}
                    </Button>
                </>
            )}

            {/* Next page button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
                aria-label="Next page"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}