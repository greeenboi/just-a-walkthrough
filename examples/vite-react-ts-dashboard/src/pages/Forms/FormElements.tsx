import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import CheckboxComponents from "../../components/form/form-elements/CheckboxComponents";
import DefaultInputs from "../../components/form/form-elements/DefaultInputs";
import DropzoneComponent from "../../components/form/form-elements/DropZone";
import FileInputExample from "../../components/form/form-elements/FileInputExample";
import InputGroup from "../../components/form/form-elements/InputGroup";
import InputStates from "../../components/form/form-elements/InputStates";
import RadioButtons from "../../components/form/form-elements/RadioButtons";
import SelectInputs from "../../components/form/form-elements/SelectInputs";
import TextAreaInput from "../../components/form/form-elements/TextAreaInput";
import ToggleSwitch from "../../components/form/form-elements/ToggleSwitch";

export default function FormElements() {
	return (
		<div data-tour="form-elements-page">
			<PageMeta
				title="React.js Form Elements Dashboard | TailAdmin - React.js Admin Dashboard Template"
				description="This is React.js Form Elements  Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
			/>
			<PageBreadcrumb pageTitle="From Elements" data-tour="form-elements-breadcrumb" />
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-2" data-tour="form-elements-grid">
				<div className="space-y-6" data-tour="form-column-left">
					<div data-tour="default-inputs-section"><DefaultInputs /></div>
					<div data-tour="select-inputs-section"><SelectInputs /></div>
					<div data-tour="textarea-input-section"><TextAreaInput /></div>
					<div data-tour="input-states-section"><InputStates /></div>
				</div>
				<div className="space-y-6" data-tour="form-column-right">
					<div data-tour="input-group-section"><InputGroup /></div>
					<div data-tour="file-input-example-section"><FileInputExample /></div>
					<div data-tour="checkbox-components-section"><CheckboxComponents /></div>
					<div data-tour="radio-buttons-section"><RadioButtons /></div>
					<div data-tour="toggle-switch-section"><ToggleSwitch /></div>
					<div data-tour="dropzone-section"><DropzoneComponent /></div>
				</div>
			</div>
		</div>
	);
}
