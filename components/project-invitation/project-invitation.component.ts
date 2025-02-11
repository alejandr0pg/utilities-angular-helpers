import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { catchError, map, of, Subscription } from 'rxjs';
import {
  PlatformKey,
  ProjectInvitationService,
} from '@/app/services/project/project-invitation.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { CommonService } from '@/app/services/common.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-project-invitation',
  templateUrl: './project-invitation.component.html',
  styleUrls: ['./project-invitation.component.scss'],
})
export class ProjectInvitationComponent implements OnInit, OnChanges {
  private translate: TranslateService = inject(TranslateService);
  @Input() platformId!: string | null;

  private sub$!: Subscription;
  private projectInvitationSrv: ProjectInvitationService = inject(
    ProjectInvitationService
  );
  private clipboard: Clipboard = inject(Clipboard);
  private toastr: ToastrService = inject(ToastrService);
  private commonSrv: CommonService = inject(CommonService);

  invitations!: any[];
  invitationModalOpen: boolean = false;
  confirmDialogOpen: boolean = false;
  loadingRemove: boolean = false;
  selectedRow!: any;
  tokenTruncated = this.commonSrv.truncateValue(this.selectedRow?.token || '');
  confirmDialogMessage = `Please confirm delete invitation with token ${this.tokenTruncated}`;

  columns = [
    { key: 'createdAt', label: 'INVITATIONS.TABLE.DATE', type: 'date-time' },
    { key: 'fullName', label: 'INVITATIONS.TABLE.NAME', type: 'titlecase' },
    { key: 'email', label: 'INVITATIONS.TABLE.EMAIL', type: 'badget:info' },
    { key: 'token', label: 'INVITATIONS.TABLE.TOKEN', type: 'wallet' },
    {
      key: 'expiredAt',
      label: 'INVITATIONS.TABLE.EXPIRED_DATE',
      type: 'date-time',
    },
    {
      key: 'valid',
      label: 'INVITATIONS.TABLE.STATUS',
      type: 'status:expired',
    },
  ];

  actions = [
    {
      label: 'INVITATIONS.TABLE.COPY_LINK',
      handler: (row: any) => {
        if (!this.platformId) {
          return;
        }
        // Copy link invitation
        this.clipboard.copy(
          this.projectInvitationSrv.getInvitationURL(
            row.token,
            this.platformId as PlatformKey
          )
        );
        this.toastr.success('The invitation link was copied to the clipboard!');
      },
    },
    {
      label: 'INVITATIONS.TABLE.DELETE',
      handler: (row: any) => {
        this.confirmDialogOpen = true;
        this.selectedRow = row;
      },
    },
  ];

  tableButtons = [
    {
      label: 'INVITATIONS.BUTTONS.SEND_INVITATION',
      icon: 'bi bi-file-earmark-text',
      handler: () => {
        this.invitationModalOpen = true;
      },
    },
  ];

  filterOptions = [
    {
      key: 'valid',
      label: 'INVITATIONS.TABLE.STATUS',
      options: [
        {
          value: true,
          label: 'INVITATIONS.TABLE.VALID',
        },
        {
          value: false,
          label: 'INVITATIONS.TABLE.EXPIRED',
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadInvitations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { platformId } = changes;
    if (platformId.currentValue) {
      this.platformId = platformId.currentValue;
    }

    this.loadInvitations();
  }

  loadInvitations() {
    if (!this.platformId) {
      return;
    }

    this.projectInvitationSrv.setProjectId(this.platformId);

    /** Cargar información */
    this.sub$ = this.projectInvitationSrv
      .getActiveDynamic([], {})
      .pipe(
        map((data: any[]) => {
          if (data.length === 0) return [];
          return data.map((row: any, index: number) => ({
            idx: index + 1,
            ...row,
          }));
        }),
        catchError((err) => {
          console.log('Error on ProjectInvitationListComponent.ngOnInit', err);
          return of([]);
        })
      )
      .subscribe((result: any[]) => {
        /** Asignar la data al dataSource */
        this.invitations = result.map((row: any, index: number) => ({
          idx: index + 1,
          valid: row.expiredAt && Date.now() < row.expiredAt,
          fullName: row.name
            ? `${row.name} ${row.lastName}`
            : 'Profile no completed',
          ...row,
        }));
      });
  }

  ngOnDestroy() {
    this.sub$.unsubscribe();
  }

  async handlerRemoveInvitation() {
    try {
      this.loadingRemove = true;
      await this.projectInvitationSrv.removeInvitation(this.selectedRow._id);
      this.confirmDialogOpen = false;

      this.toastr.success(
        this.translate.instant(`INVITATIONS.TABLE.INVITATION_DELETED`, {
          token: this.tokenTruncated,
        })
      );
    } catch (error) {
    } finally {
      this.loadingRemove = false;
    }
  }
}
