import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { supabase } from "../config/supabase";
import { adminSettingsService } from "../services/supabaseService";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
    Select,
    SelectItem,
    SelectPopup,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PageHeader, { PageHeaderStats } from "@/components/PageHeader";
import { toastManager } from "@/components/ui/toast";

const SORT_OPTIONS = [
    { label: "Alphabetical (A–Z)", value: "name-asc" },
    { label: "Alphabetical (Z–A)", value: "name-desc" },
    { label: "Price: Low to High", value: "price-low" },
    { label: "Price: High to Low", value: "price-high" },
];

const initialForm = () => ({
    name: "",
    type: "Card",
    qty: "",
    price_bought_at: "",
});

export default function InventoryPage() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [activeTab, setActiveTab] = useState("Cards");
    const [sortOption, setSortOption] = useState("name-asc");
    const [form, setForm] = useState(initialForm());
    const [editingItemId, setEditingItemId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [buyingPower, setBuyingPower] = useState(0);
    const [buyingPowerLoading, setBuyingPowerLoading] = useState(true);
    const [showAdjustDialog, setShowAdjustDialog] = useState(false);
    const [adjustValue, setAdjustValue] = useState("");
    const [adjustLoading, setAdjustLoading] = useState(false);

    const fetchBuyingPower = async () => {
        setBuyingPowerLoading(true);
        try {
            const settings = await adminSettingsService.get();
            setBuyingPower(Number(settings.buying_power || 0));
        } catch (err) {
            console.error(err);
        }
        setBuyingPowerLoading(false);
    };

    useEffect(() => {
        fetchBuyingPower();
    }, []);

    const openAdjustDialog = () => {
        setAdjustValue(String(buyingPower));
        setShowAdjustDialog(true);
    };

    const handleAdjustBuyingPower = async (e) => {
        e.preventDefault();
        setAdjustLoading(true);
        try {
            const updated = await adminSettingsService.setBuyingPower(
                Number(adjustValue),
            );
            setBuyingPower(Number(updated.buying_power));
            setShowAdjustDialog(false);
            toastManager.add({
                title: "Buying power updated",
                description: `Buying power set to $${Number(updated.buying_power).toFixed(2)}.`,
                type: "success",
            });
        } catch (err) {
            console.error(err);
            toastManager.add({
                title: "Update failed",
                description: "Couldn't update buying power. Try again.",
                type: "error",
            });
        }
        setAdjustLoading(false);
    };

    const fetchInventory = async () => {
        setListLoading(true);
        setListError("");
        const { data, error: inventoryError } = await supabase
            .from("inventory")
            .select("*")
            .order("name", { ascending: true });

        if (inventoryError) {
            setListError("Couldn't load inventory. Check your connection and try again.");
        } else {
            setInventoryItems(data || []);
        }
        setListLoading(false);
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const filteredInventory = useMemo(() => {
        const expectedType = activeTab === "Cards" ? "Card" : "Sealed Product";
        return inventoryItems.filter((item) => item.type === expectedType);
    }, [activeTab, inventoryItems]);

    const sortedInventory = useMemo(() => {
        const sorted = [...filteredInventory];

        switch (sortOption) {
            case "name-desc":
                return sorted.sort((a, b) =>
                    (b.name || "").localeCompare(a.name || ""),
                );
            case "price-low":
                return sorted.sort(
                    (a, b) =>
                        Number(a.price_bought_at || 0) -
                        Number(b.price_bought_at || 0),
                );
            case "price-high":
                return sorted.sort(
                    (a, b) =>
                        Number(b.price_bought_at || 0) -
                        Number(a.price_bought_at || 0),
                );
            case "name-asc":
            default:
                return sorted.sort((a, b) =>
                    (a.name || "").localeCompare(b.name || ""),
                );
        }
    }, [filteredInventory, sortOption]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const originalItem = editingItemId
            ? inventoryItems.find((item) => item.id === editingItemId)
            : null;

        const itemValues = {
            name: form.name,
            type: form.type,
            qty: Number(form.qty),
            price_bought_at: Number(form.price_bought_at),
        };

        const { error: saveError } = editingItemId
            ? await supabase
                  .from("inventory")
                  .update(itemValues)
                  .eq("id", editingItemId)
            : await supabase.from("inventory").insert(itemValues);

        setLoading(false);

        if (saveError) {
            console.error(saveError);
            setError("Couldn't save this item. Check the details and try again.");
            toastManager.add({
                title: "Item not saved",
                description: "Couldn't save this item. Check the details and try again.",
                type: "error",
            });
            return;
        }

        setSuccess(
            editingItemId
                ? "Inventory item updated successfully."
                : "Inventory item added successfully.",
        );
        toastManager.add({
            title: editingItemId ? "Item updated" : "Item added",
            description: editingItemId
                ? `${itemValues.name} was updated successfully.`
                : `${itemValues.name} was added to inventory.`,
            type: "success",
        });

        // New items draw down buying power by their full cost. Edited items
        // only draw down (or refund) the *change* in cost, so raising an
        // item's qty spends more buying power and lowering it refunds the
        // difference, without double-counting the portion that didn't change.
        const costDelta = editingItemId
            ? itemValues.qty * itemValues.price_bought_at -
              Number(originalItem?.qty || 0) *
                  Number(originalItem?.price_bought_at || 0)
            : itemValues.qty * itemValues.price_bought_at;

        if (costDelta !== 0) {
            try {
                const updated =
                    await adminSettingsService.adjustBuyingPower(-costDelta);
                setBuyingPower(Number(updated.buying_power));
            } catch (err) {
                console.error(err);
                toastManager.add({
                    title: "Buying power not updated",
                    description:
                        "Item was saved, but buying power couldn't be adjusted automatically.",
                    type: "warning",
                });
            }
        }

        setForm(initialForm());
        setEditingItemId(null);
        fetchInventory();
    };

    const handleEdit = (item) => {
        setForm({
            name: item.name || "",
            type: item.type || "Card",
            qty: String(item.qty ?? ""),
            price_bought_at: String(item.price_bought_at ?? ""),
        });
        setEditingItemId(item.id);
        setError("");
        setSuccess("");
    };

    const cancelEdit = () => {
        setForm(initialForm());
        setEditingItemId(null);
        setError("");
    };

    const handleDelete = async (item) => {
        const { error: deleteError } = await supabase
            .from("inventory")
            .delete()
            .eq("id", item.id);

        if (deleteError) {
            console.error(deleteError);
            toastManager.add({
                title: "Item not removed",
                description: `Couldn't remove ${item.name}. Try again.`,
                type: "error",
            });
            return;
        }

        setInventoryItems((current) =>
            current.filter((current_item) => current_item.id !== item.id),
        );
        if (editingItemId === item.id) {
            cancelEdit();
        }
        toastManager.add({
            title: "Item removed",
            description: `${item.name} was removed from inventory.`,
            type: "success",
        });

        // Removing an item frees up the buying power that was tied up in it.
        const refund = Number(item.qty || 0) * Number(item.price_bought_at || 0);
        if (refund > 0) {
            try {
                const updated = await adminSettingsService.adjustBuyingPower(refund);
                setBuyingPower(Number(updated.buying_power));
            } catch (err) {
                console.error(err);
                toastManager.add({
                    title: "Buying power not updated",
                    description:
                        "Item was removed, but buying power couldn't be adjusted automatically.",
                    type: "warning",
                });
            }
        }
    };

    const pieData = useMemo(() => {
        const cardsQty = inventoryItems
            .filter((item) => item.type === "Card")
            .reduce((sum, item) => sum + Number(item.qty || 0), 0);
        const sealedQty = inventoryItems
            .filter((item) => item.type === "Sealed Product")
            .reduce((sum, item) => sum + Number(item.qty || 0), 0);

        return [
            { name: "Cards", value: cardsQty, color: "#4f46e5" },
            { name: "Sealed Product", value: sealedQty, color: "#10b981" },
        ].filter((entry) => entry.value > 0);
    }, [inventoryItems]);

    const totalQuantity = useMemo(
        () =>
            inventoryItems.reduce(
                (sum, item) => sum + Number(item.qty || 0),
                0,
            ),
        [inventoryItems],
    );
    const totalInventoryValue = useMemo(
        () =>
            inventoryItems.reduce(
                (sum, item) =>
                    sum +
                    Number(item.qty || 0) * Number(item.price_bought_at || 0),
                0,
            ),
        [inventoryItems],
    );
    const totalCardsValue = useMemo(
        () =>
            inventoryItems
                .filter((item) => item.type === "Card")
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.qty || 0) * Number(item.price_bought_at || 0),
                    0,
                ),
        [inventoryItems],
    );
    const totalSealedValue = useMemo(
        () =>
            inventoryItems
                .filter((item) => item.type === "Sealed Product")
                .reduce(
                    (sum, item) =>
                        sum +
                        Number(item.qty || 0) * Number(item.price_bought_at || 0),
                    0,
                ),
        [inventoryItems],
    );

    return (
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
            <PageHeader
                title="Inventory"
                subtitle="Manage the cards and sealed products that power Chubb's Vault."
                actions={
                    <PageHeaderStats
                        stats={[
                            { label: "items in stock", value: totalQuantity },
                            { label: "inventory value", value: `$${totalInventoryValue.toFixed(0)}` },
                        ]}
                    />
                }
            />

            <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.2fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-slate-900">
                            {editingItemId
                                ? "Edit Inventory Item"
                                : "Add Inventory Item"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Add an item to keep your stock figures current.
                        </p>
                    </div>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <div>
                                <Label
                                    className="mb-1.5 block text-slate-900"
                                    htmlFor="inventory-name"
                                >
                                    Product Name
                                </Label>
                                <Input
                                    id="inventory-name"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm((current) => ({
                                            ...current,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Charizard ex Obsidian Flames"
                                    required
                                />
                            </div>
                            <div>
                                <Label
                                    className="mb-1.5 block text-slate-900"
                                    htmlFor="inventory-type"
                                >
                                    Type
                                </Label>
                                <SelectNative
                                    id="inventory-type"
                                    value={form.type}
                                    onChange={(e) =>
                                        setForm((current) => ({
                                            ...current,
                                            type: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="Card">Card</option>
                                    <option value="Sealed Product">
                                        Sealed Product
                                    </option>
                                </SelectNative>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <div>
                                <Label
                                    className="mb-1.5 block text-slate-900"
                                    htmlFor="inventory-qty"
                                >
                                    Current Qty
                                </Label>
                                <Input
                                    id="inventory-qty"
                                    type="number"
                                    min="0"
                                    value={form.qty}
                                    onChange={(e) =>
                                        setForm((current) => ({
                                            ...current,
                                            qty: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label
                                    className="mb-1.5 block text-slate-900"
                                    htmlFor="inventory-price"
                                >
                                    Price Bought At
                                </Label>
                                <Input
                                    id="inventory-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.price_bought_at}
                                    onChange={(e) =>
                                        setForm((current) => ({
                                            ...current,
                                            price_bought_at: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button type="submit" disabled={loading}>
                                {loading
                                    ? editingItemId
                                        ? "Updating..."
                                        : "Adding..."
                                    : editingItemId
                                      ? "Update Item"
                                      : "Add Item"}
                            </Button>
                            {editingItemId ? (
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={cancelEdit}
                                >
                                    Cancel
                                </Button>
                            ) : null}
                        </div>
                    </form>
                    {error ? (
                        <div
                            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                            role="alert"
                        >
                            {error}
                        </div>
                    ) : null}
                    {success ? (
                        <div
                            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                            role="status"
                        >
                            {success}
                        </div>
                    ) : null}
                </div>

                <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Stock list
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                            >
                                <TabsList aria-label="Inventory categories">
                                    <TabsTrigger
                                        value="Cards"
                                        className="text-xs data-[state=active]:text-indigo-600"
                                    >
                                        Cards
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="Sealed Product"
                                        className="text-xs data-[state=active]:text-indigo-600"
                                    >
                                        Sealed product
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor="inventory-sort"
                                    className="text-xs text-slate-500 whitespace-nowrap"
                                >
                                    Sort by
                                </Label>
                                <Select
                                    value={sortOption}
                                    onValueChange={setSortOption}
                                    items={SORT_OPTIONS}
                                >
                                    <SelectTrigger
                                        id="inventory-sort"
                                        size="sm"
                                        className="min-w-40 text-xs"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPopup>
                                        {SORT_OPTIONS.map(({ label, value }) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectPopup>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-full overflow-x-hidden overflow-y-auto max-h-[600px]">
                        <Table className="w-full table-fixed text-left text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-slate-900 text-xs font-medium uppercase tracking-wide text-white">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[34%] px-3 py-3 sm:w-[40%] sm:px-5">
                                        Product Name
                                    </TableHead>
                                    <TableHead className="w-[21%] px-3 py-3 sm:w-[20%] sm:px-5">
                                        Current Qty
                                    </TableHead>
                                    <TableHead className="w-[21%] px-3 py-3 sm:w-[20%] sm:px-5">
                                        Price Bought At
                                    </TableHead>
                                    <TableHead className="w-[24%] px-3 py-3 text-right sm:w-[20%] sm:px-5">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {listLoading ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan="4"
                                            className="px-5 py-10 text-center text-sm text-slate-500"
                                        >
                                            Loading inventory…
                                        </TableCell>
                                    </TableRow>
                                ) : listError ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan="4"
                                            className="px-5 py-10 text-center text-sm"
                                        >
                                            <p className="text-red-600">{listError}</p>
                                            <Button variant="outline" size="sm" type="button" className="mt-3" onClick={fetchInventory}>
                                                Try again
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ) : sortedInventory.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell
                                            colSpan="4"
                                            className="px-5 py-10 text-center text-sm text-slate-500"
                                        >
                                            No items in this category yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedInventory.map((item) => (
                                        <TableRow
                                            key={item.id}
                                            className="transition hover:bg-slate-50/80"
                                        >
                                            <TableCell className="whitespace-normal break-words px-3 py-4 font-medium text-slate-800 sm:px-5">
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="px-3 py-4 text-slate-600 sm:px-5">
                                                {item.qty}
                                            </TableCell>
                                            <TableCell className="px-3 py-4 text-slate-600 sm:px-5">
                                                $
                                                {Number(
                                                    item.price_bought_at || 0,
                                                ).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="px-3 py-4 text-right sm:px-5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 sm:hidden"
                                                        type="button"
                                                        aria-label={`Edit ${item.name}`}
                                                        onClick={() =>
                                                            handleEdit(item)
                                                        }
                                                    >
                                                        <PencilIcon />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="hidden text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 sm:inline-flex"
                                                        type="button"
                                                        onClick={() =>
                                                            handleEdit(item)
                                                        }
                                                    >
                                                        Edit
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                type="button"
                                                                aria-label={`Remove ${item.name}`}
                                                            >
                                                                <Trash2Icon />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remove this item?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This permanently removes &ldquo;{item.name}&rdquo; from inventory. This can&apos;t be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 text-white hover:bg-red-700"
                                                                    onClick={() => handleDelete(item)}
                                                                >
                                                                    Remove
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            Stock Overview
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Your inventory by category.
                        </p>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                >
                                    {pieData.map((entry) => (
                                        <Cell
                                            key={entry.name}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `${value} units`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div
                        className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600"
                        aria-label="Inventory type legend"
                    >
                        <span className="inline-flex items-center gap-2">
                            <i className="size-2.5 rounded-full bg-indigo-600" />
                            Cards
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <i className="size-2.5 rounded-full bg-emerald-500" />
                            Sealed Product
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                        <div className="col-span-2 flex items-center justify-between rounded-xl bg-indigo-50 p-3">
                            <div>
                                <strong className="block text-lg font-semibold text-slate-900">
                                    {buyingPowerLoading
                                        ? "…"
                                        : `$${buyingPower.toFixed(2)}`}
                                </strong>
                                <span className="mt-1 block text-xs text-slate-500">
                                    Buying Power
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={openAdjustDialog}
                            >
                                Adjust
                            </Button>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                            <strong className="block text-lg font-semibold text-slate-900">
                                {totalQuantity}
                            </strong>
                            <span className="mt-1 block text-xs text-slate-500">
                                Total Quantity
                            </span>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                            <strong className="block text-lg font-semibold text-slate-900">
                                ${totalInventoryValue.toFixed(2)}
                            </strong>
                            <span className="mt-1 block text-xs text-slate-500">
                                Total Value
                            </span>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                            <strong className="block text-lg font-semibold text-slate-900">
                                ${totalCardsValue.toFixed(2)}
                            </strong>
                            <span className="mt-1 block text-xs text-slate-500">
                                Cards Value
                            </span>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                            <strong className="block text-lg font-semibold text-slate-900">
                                ${totalSealedValue.toFixed(2)}
                            </strong>
                            <span className="mt-1 block text-xs text-slate-500">
                                Sealed Value
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
                <DialogContent>
                    <DialogTitle>Adjust Buying Power</DialogTitle>
                    <DialogDescription>
                        Manually set the current buying power balance.
                    </DialogDescription>
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={handleAdjustBuyingPower}
                    >
                        <div>
                            <Label
                                className="mb-1.5 block text-slate-900"
                                htmlFor="buying-power-value"
                            >
                                New Amount
                            </Label>
                            <Input
                                id="buying-power-value"
                                type="number"
                                step="0.01"
                                value={adjustValue}
                                onChange={(e) =>
                                    setAdjustValue(e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <DialogClose asChild>
                                <Button variant="outline" type="button">
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={adjustLoading}>
                                {adjustLoading ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
