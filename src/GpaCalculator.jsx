import { useMemo, useState } from "react";
import {
	GraduationCap,
	Target,
	TrendingUp,
	TrendingDown,
	Calculator,
	AlertTriangle,
	Info,
	Sparkles,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
	ReferenceDot,
} from "recharts";

// Bộ giá trị mặc định theo từng thang điểm
const PRESETS = {
	4: { min: 0, max: 4, now: 2.9, target: 3.0, future: 3.7, step: 0.01 },
	10: { min: 0, max: 10, now: 7.5, target: 8.5, future: 8.5, step: 0.1 },
};

function clamp(v, min, max) {
	return Math.max(min, Math.min(max, v));
}

function fmt(n, scale) {
	if (!Number.isFinite(n)) return "--";
	return n.toFixed(scale === "10" ? 2 : 2);
}

// G_final = (G_now * C_done + G_future * C_left) / (C_done + C_left)
function calcFinal(gNow, cDone, gFuture, cLeft) {
	const total = cDone + cLeft;
	if (total <= 0) return 0;
	return (gNow * cDone + gFuture * cLeft) / total;
}

// G_need = (G_target * (C_done + C_left) - G_now * C_done) / C_left
function calcNeed(gNow, cDone, gTarget, cLeft) {
	if (cLeft <= 0) return NaN;
	return (gTarget * (cDone + cLeft) - gNow * cDone) / cLeft;
}

// Biến toán học: ký tự chính + subscript nhỏ kiểu in nghiêng serif
function MVar({ base, sub }) {
	return (
		<span className="font-serif italic">
			{base}
			{sub && (
				<sub className="ml-px font-sans text-[0.65em] not-italic tracking-tight text-muted-foreground">
					{sub}
				</sub>
			)}
		</span>
	);
}

// Phân số có gạch ngang giữa tử và mẫu
function Frac({ num, den }) {
	return (
		<span className="inline-flex flex-col items-center align-middle leading-none">
			<span className="px-2 pb-1">{num}</span>
			<span className="h-px w-full bg-foreground/70" />
			<span className="px-2 pt-1">{den}</span>
		</span>
	);
}

// Cặp slider + number input cùng đồng bộ một state
function NumberSlider({ label, value, min, max, step, onChange, suffix }) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-3">
				<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</Label>
				<div className="flex items-center gap-1.5">
					<Input
						type="number"
						value={value}
						min={min}
						max={max}
						step={step}
						onChange={(e) => {
							const v = parseFloat(e.target.value);
							if (Number.isFinite(v)) onChange(clamp(v, min, max));
							else if (e.target.value === "") onChange(min);
						}}
						className="h-8 w-20 text-right font-mono text-sm tabular-nums"
					/>
					{suffix && (
						<span className="text-xs text-muted-foreground">{suffix}</span>
					)}
				</div>
			</div>
			<Slider
				min={min}
				max={max}
				step={step}
				value={[value]}
				onValueChange={(v) => onChange(v[0])}
			/>
		</div>
	);
}

function ResultCard({ icon: Icon, label, value, hint, tone = "default" }) {
	const tones = {
		default: "border-border bg-card",
		good: "border-emerald-500/30 bg-emerald-500/5",
		warn: "border-amber-500/30 bg-amber-500/5",
		bad: "border-rose-500/30 bg-rose-500/5",
	};
	const iconTones = {
		default: "bg-muted text-foreground",
		good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
		warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
		bad: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
	};
	return (
		<Card className={tones[tone]}>
			<CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
				<div
					className={
						"flex size-9 shrink-0 items-center justify-center rounded-md " +
						iconTones[tone]
					}
				>
					<Icon className="size-4" />
				</div>
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1">
				<div className="font-mono text-3xl font-bold tabular-nums leading-tight">
					{value}
				</div>
				{hint && <div className="text-xs text-muted-foreground">{hint}</div>}
			</CardContent>
		</Card>
	);
}

export default function GpaCalculator() {
	const [scale, setScale] = useState("4");
	const preset = PRESETS[scale];

	const [gNow, setGNow] = useState(PRESETS["4"].now);
	const [cDone, setCDone] = useState(60);
	const [cLeft, setCLeft] = useState(60);
	const [gTarget, setGTarget] = useState(PRESETS["4"].target);
	const [gFuture, setGFuture] = useState(PRESETS["4"].future);
	const [gMin, setGMin] = useState(PRESETS["4"].min);
	const [gMax, setGMax] = useState(PRESETS["4"].max);

	// Khi đổi thang điểm, scale các giá trị về preset mới
	function handleScaleChange(next) {
		if (!next || next === scale) return;
		const p = PRESETS[next];
		const ratio = p.max / preset.max;
		setGNow(clamp(+(gNow * ratio).toFixed(2), p.min, p.max));
		setGTarget(clamp(+(gTarget * ratio).toFixed(2), p.min, p.max));
		setGFuture(clamp(+(gFuture * ratio).toFixed(2), p.min, p.max));
		setGMin(p.min);
		setGMax(p.max);
		setScale(next);
	}

	const gNeed = useMemo(
		() => calcNeed(gNow, cDone, gTarget, cLeft),
		[gNow, cDone, gTarget, cLeft],
	);
	const gWorst = useMemo(
		() => calcFinal(gNow, cDone, gMin, cLeft),
		[gNow, cDone, gMin, cLeft],
	);
	const gBest = useMemo(
		() => calcFinal(gNow, cDone, gMax, cLeft),
		[gNow, cDone, gMax, cLeft],
	);
	const gFinal = useMemo(
		() => calcFinal(gNow, cDone, gFuture, cLeft),
		[gNow, cDone, gFuture, cLeft],
	);

	// Trạng thái khả thi của mục tiêu
	const reachable = gNeed <= gMax + 1e-9 && gNeed >= gMin - 1e-9;
	const alreadyMet = gNeed <= gMin + 1e-9; // luôn đạt dù học kém nhất
	const targetMet = gFinal >= gTarget - 1e-9;

	// Dữ liệu cho biểu đồ: GPA tương lai → GPA cuối
	const chartData = useMemo(() => {
		const points = [];
		const stepCount = 40;
		const step = (gMax - gMin) / stepCount;
		for (let i = 0; i <= stepCount; i++) {
			const f = gMin + step * i;
			points.push({
				future: +f.toFixed(2),
				final: +calcFinal(gNow, cDone, f, cLeft).toFixed(3),
			});
		}
		return points;
	}, [gNow, cDone, cLeft, gMin, gMax]);

	const finalAtMin = chartData[0]?.final ?? 0;
	const finalAtMax = chartData[chartData.length - 1]?.final ?? gMax;

	return (
		<div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
			{/* Header */}
			<div className="mb-6 flex items-start gap-3">
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<GraduationCap className="size-6" />
				</div>
				<div>
					<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
						Tính GPA & Lập kế hoạch cải thiện
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Tính GPA cuối cùng, GPA cần đạt cho phần còn lại của chương trình và
						mô phỏng kịch bản tốt nhất / xấu nhất.
					</p>
				</div>
			</div>

			{/* Input */}
			<Card className="mb-6">
				<CardHeader className="pb-4">
					<CardTitle className="flex items-center gap-2 text-base">
						<Calculator className="size-4 text-muted-foreground" />
						Thông số đầu vào
					</CardTitle>
					<CardDescription>
						Nhập GPA hiện tại, tín chỉ đã học và mục tiêu để xem điểm cần đạt.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							Thang điểm
						</Label>
						<ToggleGroup
							type="single"
							value={scale}
							onValueChange={handleScaleChange}
							className="flex-wrap justify-start"
						>
							<ToggleGroupItem
								value="4"
								size="sm"
								className="rounded-full border data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
							>
								Thang 4.0
							</ToggleGroupItem>
							<ToggleGroupItem
								value="10"
								size="sm"
								className="rounded-full border data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
							>
								Thang 10
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<Separator />

					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<NumberSlider
							label="GPA hiện tại"
							value={gNow}
							min={preset.min}
							max={preset.max}
							step={preset.step}
							onChange={setGNow}
						/>
						<NumberSlider
							label="GPA mục tiêu"
							value={gTarget}
							min={preset.min}
							max={preset.max}
							step={preset.step}
							onChange={setGTarget}
						/>
						<NumberSlider
							label="Tín chỉ đã học"
							value={cDone}
							min={0}
							max={150}
							step={1}
							onChange={setCDone}
						/>
						<NumberSlider
							label="Tín chỉ còn lại"
							value={cLeft}
							min={1}
							max={150}
							step={1}
							onChange={setCLeft}
						/>
						<NumberSlider
							label="GPA tối thiểu (xấu nhất)"
							value={gMin}
							min={0}
							max={preset.max}
							step={preset.step}
							onChange={setGMin}
						/>
						<NumberSlider
							label="GPA tối đa (tốt nhất)"
							value={gMax}
							min={0}
							max={preset.max}
							step={preset.step}
							onChange={setGMax}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Trạng thái khả thi */}
			{!reachable && (
				<Card className="mb-6 border-rose-500/30 bg-rose-500/5">
					<CardContent className="flex items-start gap-3 p-4">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
							<AlertTriangle className="size-4" />
						</div>
						<div className="text-sm">
							<div className="font-medium text-foreground">
								Mục tiêu chưa khả thi với cấu hình hiện tại
							</div>
							<div className="mt-0.5 text-muted-foreground">
								GPA cần đạt cho phần còn lại là{" "}
								<span className="font-mono font-semibold text-foreground">
									{fmt(gNeed, scale)}
								</span>
								, vượt khoảng [{fmt(gMin, scale)} – {fmt(gMax, scale)}]. Hãy hạ
								GPA mục tiêu, tăng số tín chỉ còn lại hoặc nâng GPA tối đa.
							</div>
						</div>
					</CardContent>
				</Card>
			)}
			{alreadyMet && reachable && (
				<Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
					<CardContent className="flex items-start gap-3 p-4">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
							<Sparkles className="size-4" />
						</div>
						<div className="text-sm">
							<div className="font-medium text-foreground">
								Mục tiêu đã chắc chắn đạt được
							</div>
							<div className="mt-0.5 text-muted-foreground">
								Với GPA hiện tại, kể cả khi phần còn lại chỉ đạt{" "}
								<span className="font-mono font-semibold text-foreground">
									{fmt(gMin, scale)}
								</span>{" "}
								thì GPA cuối vẫn ≥ mục tiêu.
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Result cards */}
			<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<ResultCard
					icon={Target}
					label="GPA cần đạt phần còn lại"
					value={fmt(gNeed, scale)}
					hint={
						reachable
							? `Để đạt mục tiêu ${fmt(gTarget, scale)} cuối khoá`
							: `Vượt giới hạn ${fmt(gMax, scale)}`
					}
					tone={reachable ? (alreadyMet ? "good" : "warn") : "bad"}
				/>
				<ResultCard
					icon={TrendingDown}
					label="Kịch bản xấu nhất"
					value={fmt(gWorst, scale)}
					hint={`Nếu phần còn lại chỉ đạt ${fmt(gMin, scale)}`}
					tone="bad"
				/>
				<ResultCard
					icon={TrendingUp}
					label="Kịch bản tốt nhất"
					value={fmt(gBest, scale)}
					hint={`Nếu phần còn lại đạt tối đa ${fmt(gMax, scale)}`}
					tone="good"
				/>
			</div>

			{/* Mô phỏng GPA tương lai → GPA cuối */}
			<Card className="mb-6">
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 text-base">
						<Sparkles className="size-4 text-muted-foreground" />
						Mô phỏng GPA cuối khoá theo GPA tương lai
					</CardTitle>
					<CardDescription>
						Kéo thanh trượt để chọn GPA dự kiến của phần còn lại và xem GPA cuối
						thay đổi tương ứng.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<NumberSlider
							label="GPA dự kiến phần còn lại"
							value={gFuture}
							min={gMin}
							max={gMax}
							step={preset.step}
							onChange={setGFuture}
						/>
						<div className="flex flex-col justify-center gap-1 rounded-md border bg-muted/30 px-4 py-3">
							<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								GPA cuối khoá dự kiến
							</span>
							<div className="flex items-baseline gap-2">
								<span className="font-mono text-2xl font-bold tabular-nums">
									{fmt(gFinal, scale)}
								</span>
								<Badge
									variant="secondary"
									className={
										targetMet
											? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
											: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
									}
								>
									{targetMet
										? "Đạt mục tiêu"
										: `Còn thiếu ${fmt(gTarget - gFinal, scale)}`}
								</Badge>
							</div>
						</div>
					</div>

					<div className="h-72 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="hsl(var(--border))"
								/>
								<XAxis
									dataKey="future"
									type="number"
									domain={[gMin, gMax]}
									tickCount={6}
									stroke="hsl(var(--muted-foreground))"
									fontSize={11}
									label={{
										value: "GPA tương lai",
										position: "insideBottom",
										offset: -2,
										fill: "hsl(var(--muted-foreground))",
										fontSize: 11,
									}}
								/>
								<YAxis
									domain={[
										Math.min(finalAtMin, gMin),
										Math.max(finalAtMax, gMax),
									]}
									stroke="hsl(var(--muted-foreground))"
									fontSize={11}
									width={40}
									label={{
										value: "GPA cuối khoá",
										angle: -90,
										position: "insideLeft",
										fill: "hsl(var(--muted-foreground))",
										fontSize: 11,
									}}
								/>
								<Tooltip
									formatter={(v) => [fmt(+v, scale), "GPA cuối khoá"]}
									labelFormatter={(v) => `GPA tương lai: ${fmt(+v, scale)}`}
									contentStyle={{
										backgroundColor: "hsl(var(--popover))",
										border: "1px solid hsl(var(--border))",
										borderRadius: 6,
										fontSize: 12,
									}}
								/>
								<ReferenceLine
									y={gTarget}
									stroke="hsl(var(--primary))"
									strokeDasharray="4 4"
									label={{
										value: `Mục tiêu ${fmt(gTarget, scale)}`,
										fill: "hsl(var(--primary))",
										fontSize: 11,
										position: "insideTopLeft",
									}}
								/>
								{reachable && (
									<ReferenceLine
										x={gNeed}
										stroke="#f59e0b"
										strokeDasharray="4 4"
										label={{
											value: `Cần ${fmt(gNeed, scale)}`,
											fill: "#f59e0b",
											fontSize: 11,
											position: "top",
										}}
									/>
								)}
								<Line
									type="monotone"
									dataKey="final"
									stroke="hsl(var(--primary))"
									strokeWidth={2}
									dot={false}
									activeDot={{ r: 4 }}
								/>
								<ReferenceDot
									x={gFuture}
									y={gFinal}
									r={5}
									fill="hsl(var(--primary))"
									stroke="hsl(var(--background))"
									strokeWidth={2}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* Công thức (math-styled) */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 text-base">
						<Info className="size-4 text-muted-foreground" />
						Công thức
					</CardTitle>
					<CardDescription>
						Trung bình có trọng số theo số tín chỉ.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Chú thích biến */}
					<div className="flex flex-wrap gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
						<div className="flex items-center gap-2">
							<MVar base="G" />
							<span className="text-muted-foreground">
								: điểm trung bình (GPA)
							</span>
						</div>
						<div className="flex items-center gap-2">
							<MVar base="C" />
							<span className="text-muted-foreground">: số tín chỉ</span>
						</div>
					</div>

					{/* GPA cuối khoá */}
					<div className="space-y-2">
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							GPA cuối khoá
						</div>
						<div className="flex items-center gap-3 overflow-x-auto py-1 text-base md:text-lg">
							<MVar base="G" sub="cuối" />
							<span className="text-muted-foreground">=</span>
							<Frac
								num={
									<span className="whitespace-nowrap">
										<MVar base="G" sub="hiện tại" />
										<span className="mx-1 text-muted-foreground">·</span>
										<MVar base="C" sub="đã học" />
										<span className="mx-1 text-muted-foreground">+</span>
										<MVar base="G" sub="tương lai" />
										<span className="mx-1 text-muted-foreground">·</span>
										<MVar base="C" sub="còn lại" />
									</span>
								}
								den={
									<span className="whitespace-nowrap">
										<MVar base="C" sub="đã học" />
										<span className="mx-1 text-muted-foreground">+</span>
										<MVar base="C" sub="còn lại" />
									</span>
								}
							/>
						</div>
					</div>

					<Separator />

					{/* GPA cần đạt */}
					<div className="space-y-2">
						<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
							GPA cần đạt phần còn lại
						</div>
						<div className="flex items-center gap-3 overflow-x-auto py-1 text-base md:text-lg">
							<MVar base="G" sub="cần" />
							<span className="text-muted-foreground">=</span>
							<Frac
								num={
									<span className="whitespace-nowrap">
										<MVar base="G" sub="mục tiêu" />
										<span className="mx-1 text-muted-foreground">·</span>
										<span className="text-muted-foreground">(</span>
										<MVar base="C" sub="đã học" />
										<span className="mx-1 text-muted-foreground">+</span>
										<MVar base="C" sub="còn lại" />
										<span className="text-muted-foreground">)</span>
										<span className="mx-1 text-muted-foreground">−</span>
										<MVar base="G" sub="hiện tại" />
										<span className="mx-1 text-muted-foreground">·</span>
										<MVar base="C" sub="đã học" />
									</span>
								}
								den={<MVar base="C" sub="còn lại" />}
							/>
						</div>
					</div>

					<div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-muted-foreground">
						Một số trường quy đổi từ thang 10 sang 4 theo bảng riêng (A, B+,
						B...) — hãy kiểm tra quy chế của trường để có kết quả chính xác.
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
