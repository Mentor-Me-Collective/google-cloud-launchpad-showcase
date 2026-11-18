import { describe, it, expect } from "vitest";
import { analyze } from "./engine";
import { parseSalary } from "../compare/engine";

describe("offer engine", () => {
  it.each([
    "Salary: ₹4,80,000 per year",
    "Salary:\n₹4,80,000\nper year",
    "Salary: 4,80,000 INR\nper year",
  ])("extracts the explicit annual INR salary from offer text: %s", (text) => {
    const report = analyze(
      `${text}\nCompany: Acme Technologies Pvt Ltd\nPosition: Engineer\nLocation: Bengaluru`,
    );
    expect(parseSalary(report.extracted.salary)).toEqual({
      amount: 480000,
      currency: "INR",
      period: "year",
    });
    expect(report.extracted.salary).not.toContain("Company");
    expect(report.findings.find((f) => f.id === "missing_details")?.evidence ?? []).not.toContain(
      "Not found: Salary / stipend",
    );
  });

  it("flags a registration fee as high concern", () => {
    const r = analyze(
      "Congratulations! Pay a registration fee of Rs 2,500 within 24 hours. Contact: hr.jobs@gmail.com",
    );
    expect(r.assessment).toBe("high_concern");
    expect(r.findings.map((f) => f.id)).toContain("payment_request");
    expect(r.findings.map((f) => f.id)).toContain("personal_email");
  });

  it("rates a complete, ordinary offer as low concern", () => {
    const r = analyze(
      "Company: Acme Technologies Pvt Ltd\nPosition: Software Engineer Intern\nStipend: ₹25,000 per month\nLocation: Bengaluru\nContact: priya@acmetech.com",
    );
    expect(r.assessment).toBe("low_concern");
  });

  it("flags shortened links", () => {
    const r = analyze("Fill your details at https://bit.ly/abc123");
    expect(r.findings.map((f) => f.id)).toContain("suspicious_links");
  });

  it.each([
    "Candidates do not pay fees",
    "Candidates do not pay registration fees.",
    "No registration fees are required.",
    "Training fees are waived.",
    "Never pay for your laptop.",
    "The company will pay for your training.",
  ])("does not flag negated or employer-paid fees: %s", (text) => {
    expect(
      analyze(text).findings.filter((f) => ["payment_request", "training_payment"].includes(f.id)),
    ).toEqual([]);
  });

  it("retains a positive request after a negated fee statement", () => {
    expect(
      analyze("Candidates do not pay fees, but pay a security deposit of Rs 2,500.").findings.map(
        (f) => f.id,
      ),
    ).toContain("payment_request");
  });

  it("flags depositing a cheque and forwarding money to a vendor", () => {
    const report = analyze("Deposit this cheque and forward money to a vendor");
    expect(report.findings.find((f) => f.id === "cheque_fraud")?.severity).toBe("high");
    expect(report.assessment).toBe("high_concern");
  });

  it("does not flag cheque fraud for a cheque alone or a negated transfer", () => {
    for (const text of [
      "Deposit this cheque for your salary.",
      "Deposit this cheque. Do not forward money to a vendor.",
    ]) {
      expect(analyze(text).findings.map((f) => f.id)).not.toContain("cheque_fraud");
    }
  });

  it("separates applicant and recruiter email ownership without applicant domain warnings", () => {
    const report = analyze(
      "Company: Acme Technologies Pvt Ltd\nApplicant email: jane@gmail.com\nTo: jane@othercompany.com\nFrom: hr@acmetech.com\nContact: hr@acmetech.com",
    );
    expect(report.extracted.applicantEmails).toEqual(["jane@gmail.com", "jane@othercompany.com"]);
    expect(report.extracted.recruiterEmails).toEqual(["hr@acmetech.com"]);
    expect(report.findings.map((f) => f.id)).not.toContain("personal_email");
    expect(report.findings.map((f) => f.id)).not.toContain("domain_mismatch");
    expect(report.findings.map((f) => f.id)).not.toContain("multiple_domains");
  });

  it("flags personal recruiter emails but leaves unlabelled or conflicting ownership unknown", () => {
    expect(analyze("Recruiter email: hr@gmail.com").findings.map((f) => f.id)).toContain(
      "personal_email",
    );
    const report = analyze("jane@gmail.com\nTo: shared@gmail.com\nFrom: shared@gmail.com");
    expect(report.extracted.unknownEmails).toEqual(["jane@gmail.com", "shared@gmail.com"]);
    expect(report.findings.map((f) => f.id)).not.toContain("personal_email");
  });

  it("classifies emails identified as belonging to recruiter, HR representative, or hiring contact using surrounding context", () => {
    const report1 = analyze(
      "HR representative: hr@acmetech.com\nHiring contact: hiring@acmetech.com\nRecruiter: recruiter@acmetech.com",
    );
    expect(report1.extracted.recruiterEmails).toEqual([
      "hr@acmetech.com",
      "hiring@acmetech.com",
      "recruiter@acmetech.com",
    ]);
    expect(report1.extracted.unknownEmails).toEqual([]);

    const report2 = analyze("Regards,\nRahul Verma\nHR Manager\nhr.globaltech.jobs@gmail.com");
    expect(report2.extracted.recruiterEmails).toEqual(["hr.globaltech.jobs@gmail.com"]);
    expect(report2.extracted.unknownEmails).toEqual([]);

    const report3 = analyze(
      "If you have questions, please reach out to our HR representative at hr@acmetech.com. Our hiring contact is contact@acmetech.com.",
    );
    expect(report3.extracted.recruiterEmails).toEqual(["hr@acmetech.com", "contact@acmetech.com"]);
    expect(report3.extracted.unknownEmails).toEqual([]);
  });

  it("does not extract fee amounts or salary-processing prose as salary", () => {
    const report = analyze(
      "Pay a registration fee of Rs 2,999. Share bank details for salary processing.",
    );
    expect(report.extracted.salary).toBeNull();
    expect(report.extracted.company).toBeNull();
    expect(report.findings.find((f) => f.id === "missing_details")?.evidence).toContain(
      "Not found: Salary / stipend",
    );
    expect(report.findings.find((f) => f.id === "missing_details")?.evidence).toContain(
      "Not found: Company name",
    );
  });

  it("keeps explicitly missing company and salary values null", () => {
    const report = analyze("Company: Not provided\nSalary: Not found\nPosition: Engineer");
    expect(report.extracted.company).toBeNull();
    expect(report.extracted.salary).toBeNull();
  });

  it("extracts a company without granting verified status", () => {
    const report = analyze("Company: Acme Technologies Pvt Ltd\nSalary: ₹25,000 per month");
    expect(report.extracted.company).toBe("Acme Technologies Pvt Ltd");
    expect(report.extracted.salary).toBe("₹25,000 per month");
    expect(["low_concern", "needs_review", "high_concern"]).toContain(report.assessment);
    expect(report).not.toHaveProperty("verified");
  });
});
