"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import type { Priority, Theme } from "@/lib/types";

const PRIORITY_COLORS: Record<Priority, string> = {
  P1: "#171717",
  P2: "#eaff2f",
  P3: "#f7f7f7",
  P4: "#d6d6d6"
};

const CHART_COLORS = ["#171717", "#eaff2f", "#6f6f6f", "#ef3f32", "#f7f7f7"];

export function ImpactCharts({ themes }: { themes: Theme[] }) {
  const priorityData = (["P1", "P2", "P3", "P4"] as Priority[])
    .map((priority) => ({
      priority,
      count: themes.filter((theme) => theme.priority === priority).length
    }))
    .filter((item) => item.count > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Impact Score Bar Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={themes} margin={{ left: -18, right: 12 }}>
                <CartesianGrid stroke="#d6d6d6" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fontSize: 11, fill: "#5a5a5a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#5a5a5a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(234, 255, 47, 0.22)" }}
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #171717",
                    boxShadow: "3px 3px 0 #171717",
                    fontFamily: "Courier New, Courier, monospace"
                  }}
                />
                <Bar dataKey="score" radius={[0, 0, 0, 0]}>
                  {themes.map((theme, index) => (
                    <Cell
                      key={theme.id}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Priority Distribution Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="count"
                  nameKey="priority"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                >
                  {priorityData.map((item) => (
                    <Cell
                      key={item.priority}
                      fill={PRIORITY_COLORS[item.priority]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 0,
                    border: "1px solid #171717",
                    boxShadow: "3px 3px 0 #171717",
                    fontFamily: "Courier New, Courier, monospace"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {priorityData.map((item) => (
              <div
                key={item.priority}
                className="flex items-center justify-between border border-foreground px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-bold uppercase">
                  <span
                    className="h-2.5 w-2.5 border border-foreground"
                    style={{ backgroundColor: PRIORITY_COLORS[item.priority] }}
                  />
                  {item.priority}
                </span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function FrequencyChart({ themes }: { themes: Theme[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Theme Frequency Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={themes}
              layout="vertical"
              margin={{ left: 22, right: 18 }}
            >
              <CartesianGrid stroke="#d6d6d6" strokeDasharray="4 4" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#5a5a5a", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={118}
                tick={{ fontSize: 12, fill: "#5a5a5a" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(234, 255, 47, 0.22)" }}
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid #171717",
                  boxShadow: "3px 3px 0 #171717",
                  fontFamily: "Courier New, Courier, monospace"
                }}
              />
              <Bar dataKey="mentions" fill="#eaff2f" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
