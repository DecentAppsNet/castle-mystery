export default interface CommandLineArgs {
  templateName:string,
  outfilePathText:string|null,
  fieldValues:Record<string, string>,
}
