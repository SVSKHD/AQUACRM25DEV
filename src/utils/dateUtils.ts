const dateUtills = {
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "2-digit",
    };
    return date.toLocaleDateString("en-IN", options);
  },
  currentYear: (): number => {
    return new Date().getFullYear();
  },
};
export default dateUtills;
