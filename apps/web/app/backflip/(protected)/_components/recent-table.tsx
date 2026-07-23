import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

const rows = [
  { name: "Cover page", type: "Narrative", status: "Done", limit: "5" },
  { name: "Table of contents", type: "Narrative", status: "In Process", limit: "3" },
  { name: "Executive summary", type: "Narrative", status: "Done", limit: "8" },
  { name: "Technical approach", type: "Technical", status: "In Process", limit: "12" },
  { name: "Design", type: "Technical", status: "Done", limit: "6" },
]

export function RecentTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Recent items and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Limit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "Done" ? "outline" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.limit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
