import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "../button"
import { Checkbox } from "../checkbox"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export type Assets = {
  id: string
  class: string
  exchange: string
  symbol: string
  name: string
  status: "active" | "inactive"
  tradable: boolean
  marginable: boolean
  maintenance_margin_requirement: number
  margin_requirement_long: string
  margin_requirement_short: string
  shortable: boolean
  easy_to_borrow: boolean
  fractionable: boolean
  attributes: string[]
}

export const asset_columns: ColumnDef<Assets>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "class",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Class
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("class")
      //parseFloat(row.getValue("class"))
      // const formatted = new Intl.NumberFormat("en-US", {
      //   style: "currency",
      //   currency: "USD",
      // }).format(amount)
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "exchange",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Exchange
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("exchange")
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "symbol",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Symbol
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("symbol")
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("name")
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "tradable",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Tradable
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("tradable")
      return <div className="text-center capitalize font-medium">{value.toString()}</div>
    }
  },
  {
    accessorKey: "marginable",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Marginable
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("marginable")
      return <div className="text-center capitalize font-medium">{value.toString()}</div>
    }
  },
  {
    accessorKey: "maintenance_margin_requirement",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Maintenance Mar gin Requirement
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("maintenance_margin_requirement")
      return <div className="text-center font-medium">{value}</div>
    }
  }, {
    accessorKey: "margin_requirement_long",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Margin Requirement Long
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("margin_requirement_long")
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "margin_requirement_short",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Margin Requirement Short
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("margin_requirement_short")
      return <div className="text-center font-medium">{value}</div>
    }
  },
  {
    accessorKey: "shortable",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Shortable
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("shortable")
      return <div className="text-center capitalize font-medium">{value.toString()}</div>
    }
  },
  {
    accessorKey: "easy_to_borrow",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Easy to Borrow
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("easy_to_borrow")
      return <div className="text-center capitalize font-medium">{value.toString()}</div>
    }
  }, {
    accessorKey: "fractionable",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Fractionable
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("fractionable")
      return <div className="text-center capitalize font-medium">{value.toString()}</div>
    }
  },
  {
    accessorKey: "attributes",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >Attributes
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const value = row.getValue("attributes")
      return <div className="text-center font-medium">{value[0]}</div>
    }
  }
]
