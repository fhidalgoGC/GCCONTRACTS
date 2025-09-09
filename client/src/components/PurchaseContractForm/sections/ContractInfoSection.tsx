import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/datepicker";
import { PersonSelectionModal } from "../../general/listInModal";
import type { PurchaseContractFormData } from "@/validation/purchaseContract.schema";
import { NUMBER_FORMAT_CONFIG } from "@/environment/environment";
import { formatNumber } from "@/lib/numberFormatter";
import { useMeasurementUnits } from "@/hooks/useMeasurementUnits";
import { useCommodities } from "@/hooks/useCommodities";
import { useCharacteristicsConfigurations } from "@/hooks/useCharacteristicsConfigurations";
import { APP_CONFIG } from "@/environment/environment";

interface ContractInfoSectionProps {
  representativeRole?:
    | "buyer"
    | "seller"
    | "trader"
    | "contactVendor"
    | "purchase"
    | "sale";
  contractType?: "purchase" | "sale";
  disabled?: boolean;
}

// Fake sellers data for display
const FAKE_SELLERS = [
  {
    id: "1",
    name: "Juan Carlos Rodríguez",
    company: "Agricola San Miguel",
    email: "juan.rodriguez@sanmiguel.com",
    phone: "+52 55 1234 5678",
    location: "Guadalajara, México",
    type: "company" as const,
  },
  {
    id: "2",
    name: "María Elena Vásquez",
    email: "maria.vasquez@email.com",
    phone: "+52 33 9876 5432",
    location: "Zapopan, México",
    type: "individual" as const,
  },
  {
    id: "3",
    name: "Roberto Fernández",
    company: "Granos del Norte SA",
    email: "r.fernandez@granoselnorte.com",
    phone: "+52 81 5555 0123",
    location: "Monterrey, México",
    type: "company" as const,
  },
  {
    id: "4",
    name: "Ana Patricia Morales",
    company: "Cooperativa El Campo",
    email: "ana.morales@elcampo.mx",
    phone: "+52 444 777 8899",
    location: "San Luis Potosí, México",
    type: "company" as const,
  },
  {
    id: "5",
    name: "Carlos David Herrera",
    email: "carlos.herrera@outlook.com",
    phone: "+52 477 123 4567",
    location: "León, México",
    type: "individual" as const,
  },
  {
    id: "6",
    name: "Luisa Fernanda García",
    company: "Agroexportadora del Bajío",
    email: "luisa.garcia@agrobajio.com",
    phone: "+52 462 888 9999",
    location: "Celaya, México",
    type: "company" as const,
  },
];

// Standardized data structure for select fields
const SUB_TYPE_OPTIONS = [
  { key: "direct", value: "direct", label: "Direct" },
  { key: "imported", value: "imported", label: "Imported" },
  {
    key: "importedFreight",
    value: "importedFreight",
    label: "Imported Freight",
  },
];

// Commodities and characteristics configurations are now loaded from API via hooks

// Remove static measurement units - now loaded from API

export function ContractInfoSection({
  representativeRole = "purchase",
  contractType = "purchase",
  disabled = false,
}: ContractInfoSectionProps) {
  const { t } = useTranslation();
  const { data: measurementUnits = [], isLoading: loadingUnits } =
    useMeasurementUnits();
  const {
    commodities,
    loading: loadingCommodities,
    error: commoditiesError,
  } = useCommodities();
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    control,
    clearErrors,
  } = useFormContext<PurchaseContractFormData>();

  // Watch for selected commodity to get commodity_id and subcategory_id
  const selectedCommodityId = watch("commodity")?.commodity_id;
  const selectedCommodity = commodities.find(
    (c) => c.key === selectedCommodityId,
  );

  // Watch quantity and thresholds to update weights automatically
  const currentQuantity = watch("quantity");
  const currentThresholds = watch("thresholds");

  React.useEffect(() => {
    if (currentQuantity && currentThresholds) {
      const minWeight =
        currentQuantity -
        (currentQuantity * (currentThresholds.min_thresholds_percentage || 0)) /
          100;
      const maxWeight =
        currentQuantity +
        (currentQuantity * (currentThresholds.max_thresholds_percentage || 0)) /
          100;

      setValue("thresholds", {
        ...currentThresholds,
        min_thresholds_weight: minWeight,
        max_thresholds_weight: maxWeight,
      });
    }
  }, [
    currentQuantity,
    currentThresholds?.min_thresholds_percentage,
    currentThresholds?.max_thresholds_percentage,
    setValue,
  ]);

  // Extract subcategory_id from commodity data (original_name_id.subcategory._id)
  // The commodities hook stores the raw data in the 'data' property
  const subcategoryId =
    selectedCommodity?.data?.original_name_id?.subcategory?._id;

  const {
    data: characteristicsConfigurations = [],
    isLoading: loadingConfigurations,
  } = useCharacteristicsConfigurations({
    commodityId: selectedCommodityId,
    subcategoryId: subcategoryId,
  });

  // Debug logging
  React.useEffect(() => {
    console.log("ContractInfoSection - Commodities loaded:", commodities);
    console.log("ContractInfoSection - Loading state:", loadingCommodities);
    console.log("ContractInfoSection - Error state:", commoditiesError);
  }, [commodities, loadingCommodities, commoditiesError]);

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          {t("contractInfo")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* All fields in 2 columns layout with immediate error rows */}
        <div className="space-y-4">
          {/* Row 1: Sub Type and Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="sub_type"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {t("subType")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <Select
                value={watch("sub_type")}
                onValueChange={(value) => {
                  setValue(
                    "sub_type",
                    value as "direct" | "imported" | "importedFreight",
                  );
                  clearErrors("sub_type");
                }}
                disabled={disabled}
              >
                <SelectTrigger
                  className={`h-10 ${errors.sub_type ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                >
                  <SelectValue placeholder={t("selectSubType")} />
                </SelectTrigger>
                <SelectContent>
                  {SUB_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="grade"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {t("grade")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <Select
                value={watch("grade")?.toString() || ""}
                onValueChange={(value) => {
                  setValue("grade", parseInt(value));
                  clearErrors("grade");
                }}
              >
                <SelectTrigger
                  className={`h-10 ${errors.grade ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                >
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 1 Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[20px]">
            <div>
              {errors.sub_type && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.sub_type.message}
                </p>
              )}
            </div>
            <div>
              {errors.grade && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.grade.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Commodity and Characteristics Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="commodity"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {t("commodity")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <Select
                value={watch("commodity")?.commodity_id || ""}
                onValueChange={(value) => {
                  // Find the selected commodity to get both ID and name
                  const selectedCommodity = commodities.find(
                    (commodity) => commodity.key === value,
                  );
                  setValue("commodity", {
                    commodity_id: value,
                    name: selectedCommodity?.label || "",
                  });
                  // Clear characteristics configuration when commodity changes
                  setValue("characteristics", {
                    configuration_id: "",
                    configuration_name: "",
                  });
                  clearErrors("commodity");
                  clearErrors("characteristics");
                }}
              >
                <SelectTrigger
                  className={`h-10 ${errors.commodity ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                >
                  <SelectValue placeholder={t("selectCommodity")} />
                </SelectTrigger>
                <SelectContent>
                  {loadingCommodities ? (
                    <SelectItem value="loading" disabled>
                      Loading commodities...
                    </SelectItem>
                  ) : commoditiesError ? (
                    <SelectItem value="error" disabled>
                      Error loading commodities
                    </SelectItem>
                  ) : commodities.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No commodities available
                    </SelectItem>
                  ) : (
                    commodities.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="characteristics_configuration"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {t("characteristicsConfiguration")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <Select
                value={watch("characteristics")?.configuration_id || ""}
                onValueChange={(value) => {
                  const selectedConfig = characteristicsConfigurations.find(
                    (opt) => opt.key === value,
                  );
                  setValue("characteristics", {
                    configuration_id: value,
                    configuration_name: selectedConfig?.label || "",
                  });
                  clearErrors("characteristics");
                }}
              >
                <SelectTrigger
                  className={`h-10 ${errors.characteristics ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                >
                  <SelectValue placeholder={t("selectConfiguration")} />
                </SelectTrigger>
                <SelectContent>
                  {!selectedCommodityId ? (
                    <SelectItem value="no-commodity" disabled>
                      Selecciona un commodity primero
                    </SelectItem>
                  ) : loadingConfigurations ? (
                    <SelectItem value="loading" disabled>
                      Cargando configuraciones...
                    </SelectItem>
                  ) : characteristicsConfigurations.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No hay configuraciones disponibles
                    </SelectItem>
                  ) : (
                    characteristicsConfigurations.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[20px]">
            <div>
              {errors.commodity && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.commodity.message}
                </p>
              )}
            </div>
            <div>
              {errors.characteristics && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.characteristics.message}
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Contract Date and Seller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="contract_date"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                {t("contractDate")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <DatePicker
                id="contract_date"
                value={watch("contract_date")}
                onChange={(date) => setValue("contract_date", date)}
                placeholder={t("contractDate")}
                error={!!errors.contract_date}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                {contractType === "sale" ? t("buyer") : t("seller")}{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <PersonSelectionModal
                personType={contractType === "sale" ? "buyers" : "sellers"}
                contractType={contractType}
                selectedPersonId={
                  watch("participants")?.find((p: any) => p.role === (contractType === "sale" ? "buyer" : "seller"))
                    ?.people_id || ""
                }
                selectedPersonName={
                  watch("participants")?.find((p: any) => p.role === (contractType === "sale" ? "buyer" : "seller"))
                    ?.name || ""
                }
                onSelect={(person) => {
                  // Add to participants array with appropriate role
                  const targetRole = contractType === "sale" ? "buyer" : "seller";
                  const currentParticipants = watch("participants") || [];
                  const updatedParticipants = currentParticipants.filter(
                    (p) => p.role !== targetRole,
                  ); // Remove existing participant with target role

                  // Add selected participant with appropriate role
                  updatedParticipants.push({
                    people_id: person.id,
                    name: person.name,
                    role: targetRole,
                  });
                  setValue("participants", updatedParticipants);

                  console.log(
                    `${targetRole} selected and added to participants with ${targetRole} role:`,
                    person,
                  );
                  console.log("Updated participants:", updatedParticipants);
                }}
              />
            </div>
          </div>

          {/* Row 3 Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[20px]">
            <div>
              {errors.contract_date && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.contract_date.message}
                </p>
              )}
            </div>
            <div>{/* Seller validation handled by participants array */}</div>
          </div>

          {/* Row 4: Contact Vendor and Trader */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Contact Vendor{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <PersonSelectionModal
                personType="contactVendors"
                selectedPersonId={
                  watch("participants")?.find(
                    (p: any) => p.role === "contactVendor",
                  )?.people_id || ""
                }
                selectedPersonName={
                  watch("participants")?.find(
                    (p: any) => p.role === "contactVendor",
                  )?.name || ""
                }
                onSelect={(person) => {
                  // Add to participants array with contactVendor role
                  const currentParticipants = watch("participants") || [];
                  const updatedParticipants = currentParticipants.filter(
                    (p) => p.role !== "contactVendor",
                  ); // Remove existing contactVendor

                  // Add selected contact vendor with contactVendor role
                  updatedParticipants.push({
                    people_id: person.id,
                    name: person.name,
                    role: "contactVendor" as const,
                  });
                  setValue("participants", updatedParticipants);

                  console.log(
                    "Contact Vendor selected and added to participants with contactVendor role:",
                    person,
                  );
                  console.log("Updated participants:", updatedParticipants);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">
                Trader{" "}
                <span className="text-red-500">{t("requiredField")}</span>
              </Label>
              <PersonSelectionModal
                personType="traders"
                selectedPersonId={
                  watch("participants")?.find((p: any) => p.role === "trader")
                    ?.people_id || ""
                }
                selectedPersonName={
                  watch("participants")?.find((p: any) => p.role === "trader")
                    ?.name || ""
                }
                onSelect={(person) => {
                  // Add to participants array with trader role
                  const currentParticipants = watch("participants") || [];
                  const updatedParticipants = currentParticipants.filter(
                    (p) => p.role !== "trader",
                  ); // Remove existing trader

                  // Add selected trader with trader role
                  updatedParticipants.push({
                    people_id: person.id,
                    name: person.name,
                    role: "trader" as const,
                  });
                  setValue("participants", updatedParticipants);

                  console.log(
                    "Trader selected and added to participants with trader role:",
                    person,
                  );
                  console.log("Updated participants:", updatedParticipants);
                }}
              />
            </div>
          </div>

          {/* Row 4 Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[20px]">
            <div>
              {/* Contact Vendor validation handled by participants array */}
            </div>
            <div>{/* Trader validation handled by participants array */}</div>
          </div>

          {/* Row 5: Reference Other Contract */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="reference_number"
                className="text-sm font-medium text-gray-900 dark:text-white"
              >
                Reference Other Contract
              </Label>
              <Input
                id="reference_number"
                {...register("reference_number")}
                className={`h-10 ${errors.reference_number ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                placeholder="Enter reference to other contract"
              />
            </div>

            {/* Empty space for alignment */}
            <div></div>
          </div>

          {/* Row 5 Errors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[20px]">
            <div>
              {errors.reference_number && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.reference_number.message}
                </p>
              )}
            </div>
            {/* Empty space for alignment */}
            <div></div>
          </div>
        </div>

        {/* Quantity & Thresholds Subsection */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            {t("quantityAndThresholds")}
          </h4>

          <div className="space-y-4">
            {/* First row: Quantity and Measurement Unit */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="quantity_subsection"
                    className="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {t("quantity")}{" "}
                    <span className="text-red-500">{t("requiredField")}</span>
                  </Label>
                  <Controller
                    name="quantity"
                    control={control}
                    render={({ field }) => {
                      const [displayValue, setDisplayValue] = React.useState(
                        () => {
                          return field.value ? field.value.toString() : "";
                        },
                      );

                      const [isFocused, setIsFocused] = React.useState(false);

                      // Update display value when field value changes externally
                      React.useEffect(() => {
                        if (!isFocused) {
                          if (field.value) {
                            setDisplayValue(
                              formatNumber({
                                minDecimals: NUMBER_FORMAT_CONFIG.minDecimals,
                                maxDecimals: NUMBER_FORMAT_CONFIG.maxDecimals,
                                value: field.value,
                                formatPattern:
                                  NUMBER_FORMAT_CONFIG.formatPattern,
                                roundMode: NUMBER_FORMAT_CONFIG.roundMode,
                              }),
                            );
                          } else {
                            setDisplayValue("");
                          }
                        }
                      }, [field.value, isFocused]);

                      return (
                        <Input
                          id="quantity_subsection"
                          type="text"
                          inputMode="decimal"
                          value={displayValue}
                          onFocus={() => {
                            setIsFocused(true);
                            // Show raw number when focused for easier editing
                            if (field.value) {
                              setDisplayValue(field.value.toString());
                            }
                          }}
                          onBlur={() => {
                            setIsFocused(false);
                            if (
                              displayValue &&
                              !isNaN(parseFloat(displayValue.replace(/,/g, "")))
                            ) {
                              const numericValue = parseFloat(
                                displayValue.replace(/,/g, ""),
                              );
                              field.onChange(numericValue);
                              setDisplayValue(
                                formatNumber({
                                  minDecimals: NUMBER_FORMAT_CONFIG.minDecimals,
                                  maxDecimals: NUMBER_FORMAT_CONFIG.maxDecimals,
                                  value: numericValue,
                                  formatPattern:
                                    NUMBER_FORMAT_CONFIG.formatPattern,
                                  roundMode: NUMBER_FORMAT_CONFIG.roundMode,
                                }),
                              );
                            }
                          }}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setDisplayValue(inputValue);

                            if (inputValue === "") {
                              field.onChange(undefined);
                              return;
                            }

                            const numericValue = parseFloat(
                              inputValue.replace(/,/g, ""),
                            );
                            if (!isNaN(numericValue)) {
                              field.onChange(numericValue);
                            }
                          }}
                          onKeyDown={(e) => {
                            const allowedKeys = [
                              "0",
                              "1",
                              "2",
                              "3",
                              "4",
                              "5",
                              "6",
                              "7",
                              "8",
                              "9",
                              ".",
                              "Backspace",
                              "Delete",
                              "Tab",
                              "Enter",
                              "ArrowLeft",
                              "ArrowRight",
                              "ArrowUp",
                              "ArrowDown",
                            ];
                            if (!allowedKeys.includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className={`h-10 ${errors.quantity ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                          placeholder="1,000.00"
                          style={{
                            MozAppearance: "textfield",
                          }}
                        />
                      );
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="measurement_unit_subsection"
                    className="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {t("measurementUnit")}{" "}
                    <span className="text-red-500">{t("requiredField")}</span>
                  </Label>
                  <Select
                    value={watch("measurement_unit_id")}
                    onValueChange={(value) => {
                      // Find the selected option to get both ID and slug
                      console.log(measurementUnits, value);
                      const selectedOption = measurementUnits.find(
                        (option) => option.key === value,
                      );
                      setValue(
                        "measurement_unit_id",
                        selectedOption?.key || "",
                      );
                      setValue("measurement_unit", selectedOption?.value || "");
                      clearErrors("measurement_unit");
                    }}
                  >
                    <SelectTrigger
                      className={`h-10 ${errors.measurement_unit ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                    >
                      <SelectValue placeholder={t("selectMeasurementUnit")} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingUnits ? (
                        <SelectItem value="loading" disabled>
                          Loading units...
                        </SelectItem>
                      ) : (
                        measurementUnits.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity and Measurement Unit Errors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[20px]">
                <div>
                  {errors.quantity && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>
                <div>
                  {errors.measurement_unit && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.measurement_unit.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Second row: Min and Max Thresholds */}
            {APP_CONFIG.SHOW_THRESHOLDS && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Min Threshold */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="thresholds.min_thresholds_percentage"
                      className="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {t("minThresholds")}{" "}
                      <span className="text-red-500">{t("requiredField")}</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="w-[100px]">
                        <Controller
                          name="thresholds.min_thresholds_percentage"
                          control={control}
                          render={({ field }) => {
                            const [displayValue, setDisplayValue] =
                              React.useState(() => {
                                return field.value
                                  ? field.value.toString()
                                  : "";
                              });

                            const [isFocused, setIsFocused] =
                              React.useState(false);

                            // Update display value when field value changes externally
                            React.useEffect(() => {
                              if (!isFocused) {
                                if (
                                  field.value !== undefined &&
                                  field.value !== null
                                ) {
                                  setDisplayValue(field.value.toFixed(2));
                                } else {
                                  setDisplayValue("");
                                }
                              }
                            }, [field.value, isFocused]);

                            return (
                              <Input
                                id="thresholds.min_thresholds_percentage"
                                type="text"
                                inputMode="decimal"
                                value={displayValue}
                                onFocus={() => {
                                  setIsFocused(true);
                                  // Show raw number when focused for easier editing
                                  if (
                                    field.value !== undefined &&
                                    field.value !== null
                                  ) {
                                    setDisplayValue(field.value.toString());
                                  }
                                }}
                                onBlur={() => {
                                  setIsFocused(false);
                                  if (
                                    displayValue &&
                                    !isNaN(parseFloat(displayValue))
                                  ) {
                                    const numericValue = Math.max(
                                      0,
                                      Math.min(100, parseFloat(displayValue)),
                                    );
                                    field.onChange(numericValue);
                                    setDisplayValue(numericValue.toFixed(2));
                                  }
                                }}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  setDisplayValue(inputValue);

                                  if (inputValue === "") {
                                    field.onChange(0);
                                    return;
                                  }

                                  const numericValue = parseFloat(inputValue);
                                  if (!isNaN(numericValue)) {
                                    const clampedValue = Math.max(
                                      0,
                                      Math.min(100, numericValue),
                                    );
                                    field.onChange(clampedValue);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const allowedKeys = [
                                    "0",
                                    "1",
                                    "2",
                                    "3",
                                    "4",
                                    "5",
                                    "6",
                                    "7",
                                    "8",
                                    "9",
                                    ".",
                                    "Backspace",
                                    "Delete",
                                    "Tab",
                                    "Enter",
                                    "ArrowLeft",
                                    "ArrowRight",
                                    "ArrowUp",
                                    "ArrowDown",
                                  ];
                                  if (!allowedKeys.includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className={`h-10 ${errors.thresholds?.min_thresholds_percentage ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                                placeholder="0.00"
                                style={{
                                  MozAppearance: "textfield",
                                }}
                              />
                            );
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {(() => {
                            const quantity = watch("quantity") || 0;
                            const percentage =
                              watch("thresholds.min_thresholds_percentage") ||
                              0;
                            const calculatedValue =
                              quantity - (quantity * percentage) / 100;

                            // Get unit display name
                            const measurementUnit = watch("measurement_unit");
                            const unitMap: Record<string, string> = {
                              unit_tons: "Tons",
                              unit_kg: "Kilograms",
                              unit_bushels: "Bushel 56",
                              unit_cwt: "Hundredweight",
                              unit_mt: "Metric Tons",
                            };
                            const unitDisplay =
                              unitMap[measurementUnit] || "Units";

                            return `${calculatedValue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ${unitDisplay}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Max Threshold */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="thresholds.max_thresholds_percentage"
                      className="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {t("maxThresholds")}{" "}
                      <span className="text-red-500">{t("requiredField")}</span>
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="w-[100px]">
                        <Controller
                          name="thresholds.max_thresholds_percentage"
                          control={control}
                          render={({ field }) => {
                            const [displayValue, setDisplayValue] =
                              React.useState(() => {
                                return field.value
                                  ? field.value.toString()
                                  : "";
                              });

                            const [isFocused, setIsFocused] =
                              React.useState(false);

                            // Update display value when field value changes externally
                            React.useEffect(() => {
                              if (!isFocused) {
                                if (
                                  field.value !== undefined &&
                                  field.value !== null
                                ) {
                                  setDisplayValue(field.value.toFixed(2));
                                } else {
                                  setDisplayValue("");
                                }
                              }
                            }, [field.value, isFocused]);

                            return (
                              <Input
                                id="thresholds.max_thresholds_percentage"
                                type="text"
                                inputMode="decimal"
                                value={displayValue}
                                onFocus={() => {
                                  setIsFocused(true);
                                  // Show raw number when focused for easier editing
                                  if (
                                    field.value !== undefined &&
                                    field.value !== null
                                  ) {
                                    setDisplayValue(field.value.toString());
                                  }
                                }}
                                onBlur={() => {
                                  setIsFocused(false);
                                  if (
                                    displayValue &&
                                    !isNaN(parseFloat(displayValue))
                                  ) {
                                    const numericValue = Math.max(
                                      0,
                                      Math.min(100, parseFloat(displayValue)),
                                    );
                                    field.onChange(numericValue);
                                    setDisplayValue(numericValue.toFixed(2));
                                  }
                                }}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  setDisplayValue(inputValue);

                                  if (inputValue === "") {
                                    field.onChange(0);
                                    return;
                                  }

                                  const numericValue = parseFloat(inputValue);
                                  if (!isNaN(numericValue)) {
                                    const clampedValue = Math.max(
                                      0,
                                      Math.min(100, numericValue),
                                    );
                                    field.onChange(clampedValue);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  const allowedKeys = [
                                    "0",
                                    "1",
                                    "2",
                                    "3",
                                    "4",
                                    "5",
                                    "6",
                                    "7",
                                    "8",
                                    "9",
                                    ".",
                                    "Backspace",
                                    "Delete",
                                    "Tab",
                                    "Enter",
                                    "ArrowLeft",
                                    "ArrowRight",
                                    "ArrowUp",
                                    "ArrowDown",
                                  ];
                                  if (!allowedKeys.includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className={`h-10 ${errors.thresholds?.max_thresholds_percentage ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-green-500"}`}
                                placeholder="100.00"
                                style={{
                                  MozAppearance: "textfield",
                                }}
                              />
                            );
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {(() => {
                            const quantity = watch("quantity") || 0;
                            const percentage =
                              watch("thresholds.max_thresholds_percentage") ||
                              0;
                            const calculatedValue =
                              quantity + (quantity * percentage) / 100;

                            // Get unit display name
                            const measurementUnit = watch("measurement_unit");
                            const unitMap: Record<string, string> = {
                              unit_tons: "Tons",
                              unit_kg: "Kilograms",
                              unit_bushels: "Bushel 56",
                              unit_cwt: "Hundredweight",
                              unit_mt: "Metric Tons",
                            };
                            const unitDisplay =
                              unitMap[measurementUnit] || "Units";

                            return `${calculatedValue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ${unitDisplay}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Min and Max Thresholds Errors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[20px]">
                  <div>
                    {errors.thresholds?.min_thresholds_percentage && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.thresholds.min_thresholds_percentage.message}
                      </p>
                    )}
                  </div>
                  <div>
                    {errors.thresholds?.max_thresholds_percentage && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.thresholds.max_thresholds_percentage.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
