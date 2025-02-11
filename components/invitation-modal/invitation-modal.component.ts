import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  Input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CustomModalComponent } from '../custom-modal/custom-modal.component';
import {
  cmCheckPendingInvitationByEmail,
  cmCheckUsedInvitationByEmail,
} from '@/app/helpers/customFormValidation.helper';
import { ProjectInvitationService } from '@/app/services/project/project-invitation.service';
import { ButtonComponent } from '../button/button.component';
import { QuickNotificationService } from '@/app/services/api/quick-notification.service';
import { ToastrService } from 'ngx-toastr';
import { PROJECTS } from '@/app/enums/projects.enum';
import { PAYMENT_MODULES } from '@/app/enums/modules.enum';
import { ProjectRolesService } from '@/app/services/project-roles.service';
import { format } from 'date-fns/format';

enum TIME_UNIT {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  MONTHS = 'months',
  YEARS = 'years',
}

interface Role {
  name: string;
  permissions: string[];
  description: string;
}

interface InvitationData {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  platform: PROJECTS;
  role: Role;
  expirationValue: number;
  expirationUnit: TIME_UNIT;
}

@Component({
  selector: 'app-invitation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomModalComponent,
    ButtonComponent,
  ],
  template: `
    <app-custom-modal [isOpen]="isOpen" (closeDialog)="onClose()">
      <ng-container dialogTitle>Send Invitation</ng-container>
      <ng-container #dialogDescription dialogDescription
        >Invite a new user to the platform</ng-container
      >
      <ng-container #dialogContent dialogContent>
        <form
          [formGroup]="invitationForm"
          (ngSubmit)="onSubmit()"
          class="space-y-4"
        >
          <div class="space-y-2">
            <label
              for="firstName"
              class="block text-sm font-medium text-gray-700"
              >First Name</label
            >
            <input
              type="text"
              id="firstName"
              formControlName="firstName"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            @if (invitationForm.get('firstName')?.invalid &&
            (invitationForm.get('firstName')?.dirty ||
            invitationForm.get('firstName')?.touched)) {
            <p class="mt-1 text-sm text-red-600">
              First name is required and must be at least 2 characters long
            </p>
            }
          </div>
          <div class="space-y-2">
            <label
              for="lastName"
              class="block text-sm font-medium text-gray-700"
              >Last Name</label
            >

            <input
              type="text"
              id="lastName"
              formControlName="lastName"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />

            <p
              *ngIf="
                invitationForm.get('lastName')?.invalid &&
                (invitationForm.get('lastName')?.dirty ||
                  invitationForm.get('lastName')?.touched)
              "
              class="mt-1 text-sm text-red-600"
            >
              <ng-container
                *ngIf="invitationForm.get('lastName')?.errors?.['required']"
              >
                Last name is required.
              </ng-container>
              <ng-container
                *ngIf="invitationForm.get('lastName')?.errors?.['minlength']"
              >
                Last name must be at least
                {{ invitationForm.get('lastName')?.errors?.['minlength'].required }}
                characters long.
              </ng-container>
            </p>
          </div>

          <div class="space-y-2">
            <label
              for="platform"
              class="block text-sm font-medium text-gray-700"
              >Platform</label
            >
            <select
              id="platform"
              formControlName="platform"
              (change)="onPlatformChange()"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option [ngValue]="PROJECTS.CRM">CRM</option>
              <option [ngValue]="PROJECTS.PAYMENT">PAYMENT</option>
            </select>
          </div>

          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-gray-700"
              >Email</label
            >
            <input
              type="email"
              id="email"
              formControlName="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            @if (invitationForm.get('email')?.invalid &&
            (invitationForm.get('email')?.dirty ||
            invitationForm.get('email')?.touched)) { @if
            (invitationForm.get('email')?.errors?.['required']) {
            <p class="mt-1 text-sm text-red-600">Email is required</p>
            } @else if (invitationForm.get('email')?.errors?.['email']) {
            <p class="mt-1 text-sm text-red-600">
              Please enter a valid email address
            </p>
            } }
            <p
              class="mt-1 text-sm text-red-600"
              *ngIf="invitationForm.get('email')?.errors?.['pendingInvitation']"
            >
              The user already has a pending invitation for the platform.
            </p>
            <p
              class="mt-1 text-sm text-red-600"
              *ngIf="invitationForm.get('email')?.errors?.['usedInvitation']"
            >
              The user already has access to the platform.
            </p>
          </div>

          <div class="space-y-2">
            <label for="role" class="block text-sm font-medium text-gray-700"
              >Role</label
            >
            <select
              id="role"
              formControlName="role"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              @for (role of availableRoles; track role.name) {
              <option [ngValue]="role">{{ role.name }}</option>
              }
            </select>
          </div>
          <div class="flex space-x-4">
            <div class="flex-1 space-y-2">
              <label
                for="expirationValue"
                class="block text-sm font-medium text-gray-700"
                >Expiration Time</label
              >
              <input
                type="number"
                id="expirationValue"
                formControlName="expirationValue"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              @if (invitationForm.get('expirationValue')?.invalid &&
              (invitationForm.get('expirationValue')?.dirty ||
              invitationForm.get('expirationValue')?.touched)) {
              <p class="mt-1 text-sm text-red-600">
                Please enter a valid number greater than 0
              </p>
              }
            </div>
            <div class="flex-1 space-y-2">
              <label
                for="expirationUnit"
                class="block text-sm font-medium text-gray-700"
                >Unit</label
              >
              <select
                id="expirationUnit"
                formControlName="expirationUnit"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option [ngValue]="TIME_UNIT.MINUTES">Minutes</option>
                <option [ngValue]="TIME_UNIT.HOURS">Hours</option>
                <option [ngValue]="TIME_UNIT.DAYS">Days</option>
                <option [ngValue]="TIME_UNIT.MONTHS">Months</option>
                <option [ngValue]="TIME_UNIT.YEARS">Years</option>
              </select>
            </div>
          </div>
        </form>
      </ng-container>
      <ng-container dialogFooter>
        <app-button variant="secondary" (click)="onClose()">Cancel</app-button>
        <app-button
          variant="primary"
          [loading]="loading"
          (click)="onSubmit()"
          [disabled]="invitationForm.invalid"
          >Send Invitation</app-button
        >
      </ng-container>
    </app-custom-modal>
  `,
})
export class InvitationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() sendInvitation = new EventEmitter<InvitationData>();

  projectInvitationSrv: ProjectInvitationService = inject(
    ProjectInvitationService
  );
  quickNotificationSrv: QuickNotificationService = inject(
    QuickNotificationService
  );
  projectRolesSrv: ProjectRolesService = inject(ProjectRolesService);
  toastr: ToastrService = inject(ToastrService);

  invitationForm: FormGroup;
  availableRoles: Role[] = [];
  loading: boolean = false;

  PROJECTS = PROJECTS;
  TIME_UNIT = TIME_UNIT;

  CRM_ROLES!: any[];

  PAYMENT_PERMISSIONS = Object.values(PAYMENT_MODULES);
  PAYMENT_ROLES = [
    {
      name: 'Owner',
      description: 'Owner permission',
      permissions: this.PAYMENT_PERMISSIONS,
    },
  ];

  constructor(private fb: FormBuilder) {
    this.invitationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [
        '',
        [Validators.required, Validators.email],
        [
          cmCheckPendingInvitationByEmail(this.projectInvitationSrv),
          cmCheckUsedInvitationByEmail(this.projectInvitationSrv),
        ],
      ],
      platform: [PROJECTS.CRM, Validators.required],
      role: ['', Validators.required],
      expirationValue: [24, [Validators.required, Validators.min(1)]],
      expirationUnit: [TIME_UNIT.HOURS, Validators.required],
    });
  }

  async ngOnInit() {
    this.setDefaultValues();

    this.invitationForm.get('platform')?.valueChanges.subscribe(() => {
      this.invitationForm.get('email')?.updateValueAndValidity();
    });
  }

  onPlatformChange() {
    const platform = this.invitationForm.get('platform')?.value;
    if (platform === PROJECTS.CRM) {
      this.availableRoles = this.CRM_ROLES;
    } else {
      this.availableRoles = this.PAYMENT_ROLES;
    }
    this.invitationForm.patchValue({ role: this.availableRoles[0] });
  }

  async setDefaultValues() {
    this.invitationForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      platform: PROJECTS.CRM,
      role: '',
      expirationValue: 24,
      expirationUnit: TIME_UNIT.HOURS,
    });

    const roles = await this.projectRolesSrv.getDynamicToPromise();
    this.CRM_ROLES = roles;
    this.availableRoles = roles;
    this.invitationForm.patchValue({ role: roles[0] });
  }

  onClose() {
    this.setDefaultValues();
    this.closeModal.emit();
  }

  async onSubmit() {
    try {
      if (this.invitationForm.valid) {
        this.loading = true;
        const formData = this.invitationForm.value;
        /** Construir documento de invitación */
        const invitationDocument =
          await this.projectInvitationSrv.buildDocument({
            name: formData.firstName,
            lastName: formData.lastName,
            email: `${formData.email}`.trim().toLowerCase(),
            role: formData.role,
            roles: formData.role.permissions,
            expireUnit: formData.expirationUnit,
            expireValue: Number(formData.expirationValue),
            projectId: formData.platform,
          });

        /** Almacenar documento de invitación */
        await this.projectInvitationSrv.storeInvitation(
          invitationDocument.token,
          invitationDocument
        );

        /** Construir enlace de invitación */
        const linkUrl = this.projectInvitationSrv.getInvitationURL(
          invitationDocument.token,
          formData.platform
        );

        /** Enviar notificación */
        await this.quickNotificationSrv.sendEmailNotification({
          subject:
            'Invitation to join a project ' +
            this.projectInvitationSrv.projectName +
            '! ' +
            format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          email: formData.email,
          greeting: 'Hello!',
          messageBody: [
            {
              type: 'line',
              text: `You have been invited to join the project ${this.projectInvitationSrv.projectName}`,
            },
            { type: 'action', action: 'Accept invitation', url: linkUrl },
            {
              type: 'line',
              text: `This invitation will expire at: ${new Date(
                invitationDocument.expiredAt
              ).toLocaleString()}`,
            },
            {
              type: 'line',
              text: `If you didn't request this, you can ignore this email.`,
            },
          ],
          salutation: 'Best regards',
        });

        this.toastr.success('Invitation send success');
        this.onClose();
      } else {
        this.invitationForm.markAllAsTouched();
      }
    } catch (error: any) {
      console.error(error);
      this.toastr.error(error, 'error');
    } finally {
      this.loading = false;
    }
  }
}
