import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProfileFormCard from "../src/components/profile/ProfileFormCard";
import type { ProfileFormValues } from "../src/lib/profile";

vi.mock("../src/lib/profile", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/profile")>("../src/lib/profile");
  return {
    ...actual,
    getProvinces: vi.fn().mockResolvedValue([{ code: "79", name: "TP. Hồ Chí Minh" }]),
    getDistricts: vi.fn().mockResolvedValue([{ code: "760", name: "Quận 1", provinceCode: "79" }]),
  };
});

describe("ProfileFormCard", () => {
  const initialValues: ProfileFormValues = {
    fullName: "Nguyễn Văn A",
    phone: "0901234567",
    provinceCode: "79",
    provinceName: "TP. Hồ Chí Minh",
    districtCode: "760",
    districtName: "Quận 1",
    addressLine: "123 Nguyễn Huệ",
    avatarUrl: null,
  };

  it("keeps typed values when a server field error is shown", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ProfileFormCard
        title="Thông tin chủ trọ"
        description="Cập nhật hồ sơ"
        email="owner@example.com"
        initialValues={initialValues}
        submitLabel="Lưu thay đổi"
        serverErrors={{}}
        onSubmit={onSubmit}
      />
    );

    const fullName = screen.getByLabelText(/Họ và tên/i) as HTMLInputElement;
    const address = screen.getByLabelText(/Địa chỉ chi tiết/i) as HTMLTextAreaElement;
    const phone = screen.getByLabelText(/Số điện thoại/i) as HTMLInputElement;

    fireEvent.change(fullName, { target: { value: "Nguyễn Văn B" } });
    fireEvent.change(address, { target: { value: "456 Mai Chí Thọ" } });

    rerender(
      <ProfileFormCard
        title="Thông tin chủ trọ"
        description="Cập nhật hồ sơ"
        email="owner@example.com"
        initialValues={initialValues}
        submitLabel="Lưu thay đổi"
        serverErrors={{ phone: "Số điện thoại này đã được sử dụng bởi tài khoản khác." }}
        onSubmit={onSubmit}
      />
    );

    expect(fullName.value).toBe("Nguyễn Văn B");
    expect(address.value).toBe("456 Mai Chí Thọ");
    expect(phone.value).toBe("0901234567");
    expect(screen.getByText("Số điện thoại này đã được sử dụng bởi tài khoản khác.")).toBeInTheDocument();
  });

  it("hides the stale server error when the user edits that field", async () => {
    render(
      <ProfileFormCard
        title="Thông tin chủ trọ"
        description="Cập nhật hồ sơ"
        email="owner@example.com"
        initialValues={initialValues}
        submitLabel="Lưu thay đổi"
        serverErrors={{ phone: "Số điện thoại này đã được sử dụng bởi tài khoản khác." }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Số điện thoại này đã được sử dụng bởi tài khoản khác.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: "0909999999" } });

    await waitFor(() => {
      expect(screen.queryByText("Số điện thoại này đã được sử dụng bởi tài khoản khác.")).not.toBeInTheDocument();
    });
  });
});
